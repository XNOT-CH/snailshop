#!/usr/bin/env node
/**
 * export-csv.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone export script — queries MySQL directly and writes UTF-8 BOM CSV
 * files to  <project-root>/exports/  so they open correctly in Excel on Windows.
 *
 * Usage:
 *   node scripts/exports/export-csv.js                  → export all tables
 *   node scripts/exports/export-csv.js orders users     → export specific tables
 *   node scripts/exports/export-csv.js --from 2024-01-01 --to 2024-12-31 orders
 *
 * Double-click: just run  export-all.bat  in the project root.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

// ── load .env.local ────────────────────────────────────────────────────────
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config({ path: path.join(__dirname, "..", ".env") });
}

const DB_URL = process.env.DATABASE_URL || process.env.MYSQL_URL;
if (!DB_URL) {
    console.error(
        "❌  DATABASE_URL (or MYSQL_URL) is not set in .env.local\n" +
        "    Please add it and try again."
    );
    process.exit(1);
}

// ── output directory ──────────────────────────────────────────────────────
const outDir = path.join(__dirname, "..", "exports");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// ── parse CLI args ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let fromDate = null;
let toDate = null;
const tableArgs = [];

for (let i = 0; i < args.length; i++) {
    if (args[i] === "--from" && args[i + 1]) { fromDate = args[++i]; }
    else if (args[i] === "--to" && args[i + 1]) { toDate = args[++i]; }
    else if (!args[i].startsWith("--")) tableArgs.push(args[i]);
}

const ALL_TABLES = ["orders", "users", "topups", "gacha", "products"];
const tablesToExport = tableArgs.length ? tableArgs : ALL_TABLES;

// ── CSV helpers ────────────────────────────────────────────────────────────
const BOM = "\uFEFF";

function escapeCell(v) {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function toCsv(rows, headers) {
    const header = headers.map(escapeCell).join(",");
    const lines = rows.map((r) => headers.map((h) => escapeCell(r[h])).join(","));
    return BOM + [header, ...lines].join("\r\n");
}

// ── date tag ───────────────────────────────────────────────────────────────
const dateTag = new Date().toISOString().slice(0, 10);

// ── query definitions ──────────────────────────────────────────────────────
function buildQueries(from, to) {
    const fromClause = from ? `'${from} 00:00:00'` : null;
    const toClause = to ? `'${to} 23:59:59'` : null;

    function dateWhere(col) {
        const parts = [];
        if (fromClause) parts.push(`${col} >= ${fromClause}`);
        if (toClause) parts.push(`${col} <= ${toClause}`);
        return parts.length ? `WHERE ${parts.join(" AND ")}` : "";
    }

    return {
        orders: {
            sql: `SELECT id, userId, totalPrice, status, purchasedAt
                  FROM orders ${dateWhere("purchasedAt")}
                  ORDER BY purchasedAt DESC LIMIT 50000`,
            headers: ["id", "userId", "totalPrice", "status", "purchasedAt"],
            file: `orders_${dateTag}.csv`,
        },
        users: {
            sql: `SELECT id, username, email, name, role, phone,
                         creditBalance, pointBalance, totalTopup, lifetimePoints, createdAt
                  FROM users
                  ORDER BY createdAt DESC LIMIT 50000`,
            headers: ["id", "username", "email", "name", "role", "phone",
                "creditBalance", "pointBalance", "totalTopup", "lifetimePoints", "createdAt"],
            file: `users_${dateTag}.csv`,
        },
        topups: {
            sql: `SELECT id, userId, amount, status, transactionRef,
                         senderName, senderBank, receiverName, receiverBank, createdAt
                  FROM topups ${dateWhere("createdAt")}
                  ORDER BY createdAt DESC LIMIT 50000`,
            headers: ["id", "userId", "amount", "status", "transactionRef",
                "senderName", "senderBank", "receiverName", "receiverBank", "createdAt"],
            file: `topups_${dateTag}.csv`,
        },
        gacha: {
            sql: `SELECT id, userId, rewardName, tier, costType, costAmount, gachaMachineId, createdAt
                  FROM GachaRollLog ${dateWhere("createdAt")}
                  ORDER BY createdAt DESC LIMIT 50000`,
            headers: ["id", "userId", "rewardName", "tier", "costType", "costAmount", "gachaMachineId", "createdAt"],
            file: `gacha_${dateTag}.csv`,
        },
        products: {
            sql: `SELECT id, name, category, price, discountPrice, currency,
                         isSold, isFeatured, sortOrder, createdAt
                  FROM products
                  ORDER BY createdAt DESC LIMIT 50000`,
            headers: ["id", "name", "category", "price", "discountPrice", "currency",
                "isSold", "isFeatured", "sortOrder", "createdAt"],
            file: `products_${dateTag}.csv`,
        },
    };
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
    console.log("━".repeat(60));
    console.log(" 📊  SnailShop CSV Exporter (UTF-8 BOM)");
    if (fromDate || toDate) {
        console.log(` 📅  Date range: ${fromDate ?? "all"} → ${toDate ?? "all"}`);
    }
    console.log(` 📁  Output: ${outDir}`);
    console.log("━".repeat(60));

    const conn = await mysql.createConnection(DB_URL);
    console.log("✅  Connected to database\n");

    const queries = buildQueries(fromDate, toDate);
    let success = 0;
    let failure = 0;

    for (const table of tablesToExport) {
        const def = queries[table];
        if (!def) {
            console.warn(`⚠️   Unknown table: "${table}" — skipped`);
            failure++;
            continue;
        }

        process.stdout.write(`   Exporting "${table}"… `);
        try {
            const [rows] = await conn.execute(def.sql);
            const csv = toCsv(rows, def.headers);
            const outFile = path.join(outDir, def.file);
            fs.writeFileSync(outFile, csv, "utf8");
            console.log(`✅  ${rows.length} rows  →  ${def.file}`);
            success++;
        } catch (err) {
            console.log(`❌  ${err.message}`);
            failure++;
        }
    }

    await conn.end();

    console.log("\n" + "━".repeat(60));
    console.log(` ✅ ${success} ส่งออกสำเร็จ   ❌ ${failure} ล้มเหลว`);
    console.log("━".repeat(60));

    if (failure > 0) process.exit(1);
}

main().catch((err) => {
    console.error("❌  Fatal error:", err.message);
    process.exit(1);
});
