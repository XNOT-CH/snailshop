// Test Thai character encoding
// Run: npx tsx scripts/test-thai-encoding.ts

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
    const conn = await mysql.createConnection({
        uri: process.env.DATABASE_URL!,
        charset: "utf8mb4",
    });

    console.log("✅ Connected to database\n");

    // 1. ตรวจสอบ charset ของ database
    const [dbCharset] = await conn.execute(
        `SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME 
         FROM information_schema.SCHEMATA 
         WHERE SCHEMA_NAME = DATABASE()`
    ) as any;
    console.log("📊 Database charset:", dbCharset[0]);

    // 2. ตรวจสอบ charset ของ connection
    const [connCharset] = await conn.execute(
        `SHOW VARIABLES LIKE 'character_set_%'`
    ) as any;
    console.log("\n📡 Connection charsets:");
    for (const row of connCharset) {
        console.log(`   ${row.Variable_name}: ${row.Value}`);
    }

    // 3. ทดสอบ insert + query ภาษาไทย
    const testText = "ภาษาไทย สวัสดี 🎮 ทดสอบ";
    console.log(`\n🧪 Thai text to test: "${testText}"`);

    const [result] = await conn.execute(
        `SELECT ? AS thai_text, CHAR_LENGTH(?) AS char_count, LENGTH(?) AS byte_count`,
        [testText, testText, testText]
    ) as any;

    const row = result[0];
    console.log(`\n✅ Result from DB:    "${row.thai_text}"`);
    console.log(`   Characters: ${row.char_count}`);
    console.log(`   Bytes:      ${row.byte_count}`);

    if (row.thai_text === testText) {
        console.log("\n🎉 Thai encoding ทำงานถูกต้อง!");
    } else {
        console.log("\n❌ Thai encoding มีปัญหา — ข้อความไม่ตรงกัน");
        console.log(`   Expected: "${testText}"`);
        console.log(`   Got:      "${row.thai_text}"`);
    }

    // 4. ตรวจสอบ collation ของ tables สำคัญ
    const [tables] = await conn.execute(
        `SELECT TABLE_NAME, TABLE_COLLATION 
         FROM information_schema.TABLES 
         WHERE TABLE_SCHEMA = DATABASE()
         ORDER BY TABLE_NAME`
    ) as any;

    console.log("\n📋 Table collations:");
    let hasWrongCollation = false;
    for (const t of tables) {
        const isOk = t.TABLE_COLLATION?.startsWith("utf8mb4");
        if (!isOk) hasWrongCollation = true;
        console.log(`   ${isOk ? "✅" : "❌"} ${t.TABLE_NAME}: ${t.TABLE_COLLATION}`);
    }

    if (hasWrongCollation) {
        console.log("\n⚠️  พบ table ที่ไม่ใช่ utf8mb4 — รัน SQL นี้เพื่อแก้:");
        console.log(`   ALTER DATABASE <db_name> CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        console.log(`   -- แล้วรัน: npx drizzle-kit push  (เพื่อ recreate tables)`);
    }

    await conn.end();
}

main().catch((e) => { console.error("❌ Error:", e.message); process.exit(1); });
