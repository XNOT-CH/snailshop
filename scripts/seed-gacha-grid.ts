// Script to seed gacha grid rewards
// Run: npx tsx scripts/seed-gacha-grid.ts

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { gachaRewards } from "../lib/db/schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const rewards = [
    { rewardType: "CREDIT", rewardName: "เครดิต 5 บาท", rewardAmount: "5", tier: "common" },
    { rewardType: "CREDIT", rewardName: "เครดิต 10 บาท", rewardAmount: "10", tier: "common" },
    { rewardType: "CREDIT", rewardName: "เครดิต 25 บาท", rewardAmount: "25", tier: "rare" },
    { rewardType: "CREDIT", rewardName: "เครดิต 50 บาท", rewardAmount: "50", tier: "epic" },
    { rewardType: "CREDIT", rewardName: "เครดิต 100 บาท", rewardAmount: "100", tier: "legendary" },
    { rewardType: "POINT", rewardName: "พอยต์ 5 แต้ม", rewardAmount: "5", tier: "common" },
    { rewardType: "POINT", rewardName: "พอยต์ 15 แต้ม", rewardAmount: "15", tier: "rare" },
    { rewardType: "POINT", rewardName: "พอยต์ 30 แต้ม", rewardAmount: "30", tier: "epic" },
    { rewardType: "POINT", rewardName: "พอยต์ 50 แต้ม", rewardAmount: "50", tier: "legendary" },
];

async function main() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);
    const db = drizzle(connection);

    let count = 0;
    for (const r of rewards) {
        await db.insert(gachaRewards).values({
            id: crypto.randomUUID(),
            rewardType: r.rewardType,
            rewardName: r.rewardName,
            rewardAmount: r.rewardAmount,
            tier: r.tier,
            isActive: true,
        });
        count++;
        console.log(`✅ [${count}/${rewards.length}] ${r.rewardName}`);
    }

    console.log(`\n🎉 เพิ่มรางวัลทดสอบ ${count} รายการสำเร็จ!`);
    await connection.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
