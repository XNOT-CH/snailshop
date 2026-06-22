// Usage: npx tsx scripts/db/find-anomaly-products.ts
//
// Scans the Product table for anomalies and prints a grouped report.
// Three groups are checked:
//   1. Data integrity  - bad prices, blank required fields, overdue deletes
//   2. Stock / cross-table consistency - isSold vs real stock, stockCount drift,
//      decrypt failures, orders/gacha rewards pointing at invalid products
//   3. Price outliers  - products whose price is a statistical outlier within
//      their own category (informational, not a hard error)
//
// Report-only: exits 0 unless the database is unreachable.

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { decrypt } from "../../lib/encryption";
import { getStockCount, findDuplicateStockUser } from "../../lib/stock";

dotenv.config({ path: ".env.local" });
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

// Outlier tuning: only flag categories with enough samples, and a high z-score
const OUTLIER_MIN_CATEGORY_SIZE = 5;
const OUTLIER_Z_THRESHOLD = 3;

type ProductRow = {
    id: string;
    name: string | null;
    category: string | null;
    price: string;
    discountPrice: string | null;
    isSold: 0 | 1 | boolean;
    stockCount: number | null;
    secretData: string | null;
    stockSeparator: string | null;
    orderId: string | null;
    scheduledDeleteAt: string | null;
};

type Finding = { id: string; name: string; detail: string };

function maskDatabaseUrl(value: string) {
    return value.replace(/:([^@]+)@/, ":***@");
}

function asBool(value: 0 | 1 | boolean): boolean {
    return value === 1 || value === true;
}

function label(product: ProductRow): string {
    return product.name?.trim() || "(no name)";
}

function printGroup(title: string, findings: Finding[]) {
    console.log(`\n${title} — ${findings.length} found`);
    if (findings.length === 0) {
        console.log("  ✓ none");
        return;
    }
    for (const f of findings) {
        console.log(`  - [${f.id}] ${f.name}: ${f.detail}`);
    }
}

async function main() {
    if (!DATABASE_URL) {
        throw new Error("DATABASE_URL is not set.");
    }

    const isTiDB = DATABASE_URL.includes("tidbcloud.com");
    const connection = await mysql.createConnection({
        uri: DATABASE_URL,
        ssl: isTiDB ? { rejectUnauthorized: true } : undefined,
    });

    try {
        console.log(`Scanning Product table for anomalies via ${maskDatabaseUrl(DATABASE_URL)}`);

        const [rows] = await connection.execute(
            `SELECT id, name, category, price, discountPrice, isSold, stockCount,
                    secretData, stockSeparator, orderId, scheduledDeleteAt
             FROM Product`,
        );
        const products = rows as ProductRow[];
        console.log(`Loaded ${products.length} products.`);

        const integrity: Finding[] = [];
        const consistency: Finding[] = [];
        const outliers: Finding[] = [];

        const now = Date.now();
        const byCategory = new Map<string, { id: string; name: string; price: number }[]>();

        for (const p of products) {
            const name = label(p);
            const price = Number(p.price);
            const discount = p.discountPrice === null ? null : Number(p.discountPrice);
            const sold = asBool(p.isSold);

            // ── Group 1: data integrity ───────────────────────────────
            if (!Number.isFinite(price) || price <= 0) {
                integrity.push({ id: p.id, name, detail: `price is ${p.price}` });
            }
            if (discount !== null && Number.isFinite(discount)) {
                if (discount <= 0) {
                    integrity.push({ id: p.id, name, detail: `discountPrice is ${p.discountPrice}` });
                } else if (discount >= price) {
                    integrity.push({
                        id: p.id,
                        name,
                        detail: `discountPrice ${p.discountPrice} >= price ${p.price} (not a discount)`,
                    });
                }
            }
            if (!p.name?.trim()) {
                integrity.push({ id: p.id, name, detail: "name is blank" });
            }
            if (!p.category?.trim()) {
                integrity.push({ id: p.id, name, detail: "category is blank" });
            }
            if (typeof p.stockCount === "number" && p.stockCount < 0) {
                integrity.push({ id: p.id, name, detail: `stockCount is ${p.stockCount}` });
            }
            if (p.scheduledDeleteAt) {
                const due = Date.parse(p.scheduledDeleteAt.replace(" ", "T"));
                if (Number.isFinite(due) && due < now) {
                    integrity.push({
                        id: p.id,
                        name,
                        detail: `scheduledDeleteAt ${p.scheduledDeleteAt} is overdue but row still exists`,
                    });
                }
            }

            // ── Group 2: stock / cross-table consistency ──────────────
            let realStock: number | null = null;
            const raw = p.secretData ?? "";
            if (!raw.trim()) {
                consistency.push({ id: p.id, name, detail: "secretData is blank" });
            } else {
                try {
                    const plain = decrypt(raw);
                    realStock = getStockCount(plain, p.stockSeparator || "newline");

                    if (sold && realStock > 0) {
                        consistency.push({
                            id: p.id,
                            name,
                            detail: `isSold=true but real stock is ${realStock}`,
                        });
                    }
                    if (!sold && realStock === 0) {
                        consistency.push({
                            id: p.id,
                            name,
                            detail: "isSold=false but real stock is 0 (sold out, not flagged)",
                        });
                    }
                    if (typeof p.stockCount === "number" && p.stockCount !== realStock) {
                        consistency.push({
                            id: p.id,
                            name,
                            detail: `stored stockCount ${p.stockCount} != real stock ${realStock} (drift)`,
                        });
                    }
                    if (p.stockCount === null) {
                        consistency.push({
                            id: p.id,
                            name,
                            detail: `stored stockCount is NULL (real stock ${realStock})`,
                        });
                    }
                    const dupUser = findDuplicateStockUser(plain, p.stockSeparator || "newline");
                    if (dupUser) {
                        consistency.push({
                            id: p.id,
                            name,
                            detail: `duplicate stock account "${dupUser}"`,
                        });
                    }
                } catch (error) {
                    consistency.push({
                        id: p.id,
                        name,
                        detail: `secretData failed to decrypt: ${error instanceof Error ? error.message : String(error)}`,
                    });
                }
            }

            // Note: orderId set while isSold=false is NOT an anomaly — the purchase
            // path (lib/features/orders/purchase.ts) always rewrites orderId to the
            // latest order even when stock remains, so partial sales legitimately
            // leave orderId set with isSold=false.

            // collect for outlier pass
            if (p.category?.trim() && Number.isFinite(price) && price > 0) {
                const bucket = byCategory.get(p.category) ?? [];
                bucket.push({ id: p.id, name, price });
                byCategory.set(p.category, bucket);
            }
        }

        // ── Cross-table: orphan order refs ────────────────────────────
        const orderIds = products.map((p) => p.orderId).filter((x): x is string => Boolean(x));
        if (orderIds.length > 0) {
            const placeholders = orderIds.map(() => "?").join(",");
            const [orderRows] = await connection.execute(
                `SELECT id FROM \`Order\` WHERE id IN (${placeholders})`,
                orderIds,
            );
            const existing = new Set((orderRows as { id: string }[]).map((r) => r.id));
            for (const p of products) {
                if (p.orderId && !existing.has(p.orderId)) {
                    consistency.push({
                        id: p.id,
                        name: label(p),
                        detail: `orderId ${p.orderId} points to a missing Order`,
                    });
                }
            }
        }

        // ── Cross-table: gacha rewards pointing at sold/missing products ─
        const [rewardRows] = await connection.execute(
            `SELECT productId FROM GachaReward WHERE productId IS NOT NULL AND isActive = 1`,
        );
        const rewardProductIds = (rewardRows as { productId: string }[]).map((r) => r.productId);
        if (rewardProductIds.length > 0) {
            const productById = new Map(products.map((p) => [p.id, p]));
            for (const pid of rewardProductIds) {
                const prod = productById.get(pid);
                if (!prod) {
                    consistency.push({
                        id: pid,
                        name: "(gacha reward)",
                        detail: "active GachaReward points to a missing Product",
                    });
                } else if (asBool(prod.isSold)) {
                    consistency.push({
                        id: pid,
                        name: label(prod),
                        detail: "active GachaReward points to a SOLD product",
                    });
                }
            }
        }

        // ── Group 3: price outliers within category ───────────────────
        for (const [category, items] of byCategory) {
            if (items.length < OUTLIER_MIN_CATEGORY_SIZE) continue;
            const prices = items.map((i) => i.price);
            const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
            const variance = prices.reduce((a, b) => a + (b - mean) ** 2, 0) / prices.length;
            const stddev = Math.sqrt(variance);
            if (stddev === 0) continue;

            for (const item of items) {
                const z = (item.price - mean) / stddev;
                if (Math.abs(z) >= OUTLIER_Z_THRESHOLD) {
                    outliers.push({
                        id: item.id,
                        name: item.name,
                        detail: `price ${item.price} in "${category}" is z=${z.toFixed(1)} (mean ${mean.toFixed(0)}, sd ${stddev.toFixed(0)})`,
                    });
                }
            }
        }

        printGroup("Group 1 · Data integrity", integrity);
        printGroup("Group 2 · Stock / cross-table consistency", consistency);
        printGroup("Group 3 · Price outliers (informational)", outliers);

        const total = integrity.length + consistency.length + outliers.length;
        console.log(`\nDone. ${total} anomaly finding(s) across ${products.length} products.`);
    } finally {
        await connection.end();
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
