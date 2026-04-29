import { createPool } from "mysql2/promise";
import { config } from "dotenv";
import { readFileSync } from "fs";

// Load .env.local
try {
    const envContent = readFileSync(".env.local", "utf-8");
    envContent.split("\n").forEach((line) => {
        const [key, ...vals] = line.split("=");
        if (key && vals.length) process.env[key.trim()] = vals.join("=").trim();
    });
} catch {
    // fallback: dotenv
    config({ path: ".env.local" });
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error("❌ DATABASE_URL not found in .env.local");
    process.exit(1);
}

console.log("🔌 Connecting to database...");
const pool = createPool({ uri: dbUrl });

async function run() {
    const conn = await pool.getConnection();
    try {
        console.log("📋 Checking existing columns in SiteSettings...");
        const [rows] = await conn.query(`SHOW COLUMNS FROM SiteSettings`);
        const existing = rows.map((r) => r.Field);
        console.log("   Existing columns:", existing.join(", "));

        const toAdd = [];
        if (!existing.includes("backgroundBlur")) {
            toAdd.push("ADD COLUMN `backgroundBlur` tinyint(1) NOT NULL DEFAULT 1");
            console.log("   ➕ Will add: backgroundBlur");
        } else {
            console.log("   ✅ backgroundBlur already exists");
        }
        if (!existing.includes("showAllProducts")) {
            toAdd.push("ADD COLUMN `showAllProducts` tinyint(1) NOT NULL DEFAULT 1");
            console.log("   ➕ Will add: showAllProducts");
        } else {
            console.log("   ✅ showAllProducts already exists");
        }

        if (toAdd.length === 0) {
            console.log("\n✅ All columns already exist! No changes needed.");
            return;
        }

        const sql = `ALTER TABLE SiteSettings ${toAdd.join(", ")}`;
        console.log("\n🔧 Running:", sql);
        await conn.query(sql);
        console.log("✅ Done! Columns added successfully.");
    } finally {
        conn.release();
        await pool.end();
    }
}

run().catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});
