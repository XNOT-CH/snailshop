// Script to fix admin password
// Run: npx tsx scripts/fix-admin-password.ts

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";
import { users } from "../lib/db/schema";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const username = "REDACTED_USERNAME";
const newPassword = "REDACTED_PASSWORD"; // Change this!

async function main() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);
    const db = drizzle(connection);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.username, username));

    console.log(`✅ Password updated for ${username}`);
    console.log(`New password: ${newPassword}`);
    await connection.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
