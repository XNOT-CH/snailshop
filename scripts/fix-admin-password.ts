// Script to fix admin password
// Run: npx tsx scripts/fix-admin-password.ts <username> <new-password>
// Example: npx tsx scripts/fix-admin-password.ts REDACTED_USERNAME MyNewPass123

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";
import { users } from "../lib/db/schema";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const username = process.argv[2];
const newPassword = process.argv[3];

if (!username || !newPassword) {
    console.error("❌ Usage: npx tsx scripts/fix-admin-password.ts <username> <new-password>");
    process.exit(1);
}

if (newPassword.length < 8) {
    console.error("❌ Password must be at least 8 characters long.");
    process.exit(1);
}

async function main() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);
    const db = drizzle(connection);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.username, username));

    console.log(`✅ Password updated for "${username}"`);
    await connection.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
