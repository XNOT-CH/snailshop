// Usage: npx tsx scripts/products/backfill-stock-count.ts

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { decrypt } from "../../lib/encryption";
import { getStockCount } from "../../lib/stock";

dotenv.config({ path: ".env.local" });
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

type ProductStockRow = {
    id: string;
    isSold: 0 | 1 | boolean;
    secretData: string | null;
    stockSeparator: string | null;
};

function maskDatabaseUrl(value: string) {
    return value.replace(/:([^@]+)@/, ":***@");
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
        console.log(`Backfilling Product.stockCount via ${maskDatabaseUrl(DATABASE_URL)}`);

        const [rows] = await connection.execute(
            "SELECT id, isSold, secretData, stockSeparator FROM Product WHERE stockCount IS NULL",
        );
        const products = rows as ProductStockRow[];

        let updated = 0;
        let skipped = 0;

        for (const product of products) {
            try {
                const stockCount = product.isSold ? 0 : getStockCount(
                    decrypt(product.secretData || ""),
                    product.stockSeparator || "newline",
                );

                await connection.execute(
                    "UPDATE Product SET stockCount = ?, isSold = ? WHERE id = ?",
                    [stockCount, stockCount === 0 ? 1 : 0, product.id],
                );
                updated += 1;
            } catch (error) {
                skipped += 1;
                console.warn(`Skipped product ${product.id}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        console.log(`Updated: ${updated}`);
        console.log(`Skipped: ${skipped}`);
    } finally {
        await connection.end();
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
