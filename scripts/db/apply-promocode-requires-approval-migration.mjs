// One-off runner for drizzle/0032_promocode_requires_approval.sql
// Applies the idempotent PromoCode.requiresApproval column on a single connection
// (the SQL uses @session variables that must persist across statements).
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

config({ path: fs.existsSync(".env.local") ? ".env.local" : ".env.development.local" });

const url = process.env.DATABASE_URL;
if (!url) {
    console.error("DATABASE_URL not found in env");
    process.exit(1);
}

const sql = fs.readFileSync(path.resolve("drizzle/0032_promocode_requires_approval.sql"), "utf8");
const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
    .filter((s) => s.length > 0);

const isTiDB = url.includes("tidbcloud.com");
const conn = await mysql.createConnection({
    uri: url,
    ssl: isTiDB ? { rejectUnauthorized: true } : undefined,
});
try {
    for (const stmt of statements) {
        await conn.query(stmt);
    }
    console.log(`Applied ${statements.length} statements successfully.`);
} catch (err) {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
} finally {
    await conn.end();
}
