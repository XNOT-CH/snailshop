// Script to fix admin password
// Run: npx ts-node --skip-project scripts/fix-admin-password.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const username = "REDACTED_USERNAME";
    const newPassword = "REDACTED_PASSWORD"; // New password - change this!

    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    await prisma.user.update({
        where: { username },
        data: { password: hashedPassword },
    });

    console.log(`✅ Password updated for ${username}`);
    console.log(`New password: ${newPassword}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
