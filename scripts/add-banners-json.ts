/**
 * Migration script: Add bannersJson column to SiteSettings table
 * Run: npx tsx scripts/add-banners-json.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import mysql from "mysql2/promise";

async function main() {
    const pool = mysql.createPool({
        uri: process.env.DATABASE_URL!,
        ssl: process.env.DATABASE_URL?.includes("tidbcloud.com") ? { rejectUnauthorized: true } : undefined,
    });

    try {
        console.log("Adding bannersJson column to SiteSettings...");
        await pool.execute(`
            ALTER TABLE \`SiteSettings\`
            ADD COLUMN \`bannersJson\` TEXT NULL
        `);
        console.log("✅ Done! bannersJson column added successfully.");
    } catch (err: unknown) {
        const error = err as { code?: string; message?: string };
        if (error.code === "ER_DUP_FIELDNAME") {
            console.log("ℹ️  Column already exists, skipping.");
        } else {
            console.error("❌ Error:", error.message);
            process.exit(1);
        }
    } finally {
        await pool.end();
    }
}

main();
