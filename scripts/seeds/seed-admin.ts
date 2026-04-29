// scripts/seeds/seed-admin.ts
// Create or reset admin user in TiDB Cloud
// Run: npx tsx scripts/seeds/seed-admin.ts <username> <password>
// Example: npx tsx scripts/seeds/seed-admin.ts admin MyPassword123

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";
import { users } from "../lib/db/schema";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL!;
const isTiDB = DATABASE_URL?.includes("tidbcloud.com");

const username = process.argv[2] ?? "admin";
const password = process.argv[3];

if (!password) {
    console.error("Usage: npx tsx scripts/seeds/seed-admin.ts <username> <password>");
    console.error("Example: npx tsx scripts/seeds/seed-admin.ts admin MyPassword123");
    process.exit(1);
}

if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
}

async function main() {
    const conn = await mysql.createConnection({
        uri: DATABASE_URL,
        ssl: isTiDB ? { rejectUnauthorized: true } : undefined,
    });
    const db = drizzle(conn);

    console.log(`Checking for user: ${username} ...`);

    const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);

    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    if (existing.length > 0) {
        // Update existing user to ADMIN + new password
        await db.update(users)
            .set({ password: hashedPassword, role: "ADMIN", updatedAt: now })
            .where(eq(users.username, username));
        console.log(`[OK] Updated '${username}' -> role=ADMIN, new password set.`);
    } else {
        // Insert new admin user
        await db.insert(users).values({
            id: crypto.randomUUID(),
            username,
            name: username,
            email: `${username}@localhost`,
            password: hashedPassword,
            role: "ADMIN",
            createdAt: now,
            updatedAt: now,
        });
        console.log(`[OK] Created admin user '${username}'.`);
    }

    await conn.end();
    console.log("Done. You can now login with these credentials.");
}

main().catch((e) => {
    console.error("[ERROR]", e.message);
    process.exit(1);
});
