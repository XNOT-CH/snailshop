// scripts/seed-roles.ts
// Insert default system roles into the Role table if they don't exist
// Run: npx tsx scripts/seed-roles.ts

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";
import { roles } from "../lib/db/schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL!;
const isTiDB = DATABASE_URL?.includes("tidbcloud.com");

const DEFAULT_ROLES = [
    {
        id: crypto.randomUUID(),
        name: "ผู้ดูแลระบบ",
        code: "ADMIN",
        description: "สิทธิ์เต็มในการจัดการระบบ",
        isSystem: true,
        sortOrder: 0,
    },
    {
        id: crypto.randomUUID(),
        name: "ผู้ใช้งานทั่วไป",
        code: "USER",
        description: "ผู้ใช้งานทั่วไป",
        isSystem: true,
        sortOrder: 1,
    },
];

async function main() {
    const conn = await mysql.createConnection({
        uri: DATABASE_URL,
        ssl: isTiDB ? { rejectUnauthorized: true } : undefined,
    });
    const db = drizzle(conn);
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    for (const role of DEFAULT_ROLES) {
        const existing = await db.select().from(roles).where(eq(roles.code, role.code)).limit(1);
        if (existing.length > 0) {
            console.log(`[SKIP] Role '${role.code}' already exists.`);
        } else {
            await db.insert(roles).values({ ...role, createdAt: now, updatedAt: now });
            console.log(`[OK] Inserted role '${role.code}' (${role.name}).`);
        }
    }

    await conn.end();
    console.log("Done.");
}

main().catch((e) => {
    console.error("[ERROR]", e.message);
    process.exit(1);
});
