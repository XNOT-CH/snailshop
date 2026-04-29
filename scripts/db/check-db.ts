// scripts/db/check-db.ts
// Diagnose TiDB Cloud connection and check if tables/admin user exist
// Run: npx tsx scripts/db/check-db.ts

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL not set in .env.local");
    process.exit(1);
}

const isTiDB = DATABASE_URL.includes("tidbcloud.com");

async function main() {
    console.log("🔍 Connecting to database...");
    console.log("   URL:", DATABASE_URL.replace(/:([^@]+)@/, ":***@")); // mask password

    const conn = await mysql.createConnection({
        uri: DATABASE_URL,
        ssl: isTiDB ? { rejectUnauthorized: true } : undefined,
    });

    console.log("✅ Connected!\n");

    // Show current database
    const [dbRows] = await conn.execute("SELECT DATABASE() as db");
    console.log("📁 Database:", (dbRows as { db: string }[])[0].db);

    // List tables
    const [tables] = await conn.execute("SHOW TABLES");
    const tableList = (tables as Record<string, string>[]).map(r => Object.values(r)[0]);
    console.log(`\n📋 Tables (${tableList.length} found):`);
    if (tableList.length === 0) {
        console.log("   ⚠️  No tables found! Run: npm run db:push");
    } else {
        tableList.forEach(t => console.log(`   - ${t}`));
    }

    // Check for User table (TiDB Cloud uses PascalCase table names)
    const userTableName = (tableList as string[]).find((t: string) =>
        t.toLowerCase() === "user" || t.toLowerCase() === "users"
    );

    if (userTableName) {
        const [users] = await conn.execute(`SELECT id, username, role FROM \`${userTableName}\` LIMIT 10`);
        const userList = users as { id: string, username: string, role: string }[];
        console.log(`\n👤 Users in '${userTableName}' table (${userList.length} found):`);
        if (userList.length === 0) {
            console.log("   ⚠️  No users found! Need to create admin user.");
            console.log("   Run: npx tsx scripts/seeds/seed-admin.ts");
        } else {
            userList.forEach(u => console.log(`   - ${u.username} [${u.role}] (id: ${u.id})`));
        }
    } else {
        console.log("\n⚠️  No User table found - run: npm run db:push");
    }

    await conn.end();
    console.log("\n✅ Done.");
}

main().catch((e) => {
    console.error("❌ Error:", e.message);
    process.exit(1);
});
