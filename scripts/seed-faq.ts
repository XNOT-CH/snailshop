// Script to seed FAQ/Help articles
// Run: npx tsx scripts/seed-faq.ts

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { helpArticles } from "../lib/db/schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const faqData = [
    {
        question: "ร้านนี้ขายอะไรบ้าง?",
        answer: "เราขายบัญชีเกมต่างๆ เช่น ROV, Valorant, และอื่นๆ ทุกบัญชีรับประกันความปลอดภัย ไม่มีการแฮกคืน",
        category: "general",
        sortOrder: 1,
        isActive: true,
    },
    {
        question: "สินค้ารับประกันหรือไม่?",
        answer: "ทุกสินค้ามีการรับประกันตามที่ระบุ หากมีปัญหาสามารถติดต่อทีมงานได้ตลอด 24 ชั่วโมง",
        category: "general",
        sortOrder: 2,
        isActive: true,
    },
    {
        question: "ฉันเติมเงินได้อย่างไร?",
        answer: "ไปที่หน้าเติมเงิน → อัพโหลดสลิปโอนเงิน → ระบบจะตรวจสอบและเติมเครดิตให้อัตโนมัติภายใน 1-5 นาที",
        category: "payment",
        sortOrder: 1,
        isActive: true,
    },
    {
        question: "รองรับช่องทางการชำระเงินอะไรบ้าง?",
        answer: "รองรับการโอนผ่านพร้อมเพย์และบัญชีธนาคารที่กำหนด สามารถดูเลขบัญชีได้ที่หน้าเติมเงิน",
        category: "payment",
        sortOrder: 2,
        isActive: true,
    },
    {
        question: "เติมเงินแล้วไม่เข้าทำอย่างไร?",
        answer: "กรุณารอ 5-10 นาที หากยังไม่เข้าให้ติดต่อแอดมินพร้อมแนบสลิปโอนเงิน",
        category: "payment",
        sortOrder: 3,
        isActive: true,
    },
    {
        question: "ซื้อสินค้าแล้วได้รับข้อมูลเมื่อไหร่?",
        answer: "หลังชำระเงินสำเร็จ คุณจะได้รับข้อมูลบัญชี (ID/Password) ทันทีในหน้าประวัติการสั่งซื้อ",
        category: "order",
        sortOrder: 1,
        isActive: true,
    },
    {
        question: "ยกเลิกคำสั่งซื้อได้หรือไม่?",
        answer: "ไม่สามารถยกเลิกได้หลังจากชำระเงินแล้ว เนื่องจากระบบจะส่งข้อมูลบัญชีให้ทันที",
        category: "order",
        sortOrder: 2,
        isActive: true,
    },
    {
        question: "ลืมรหัสผ่านทำอย่างไร?",
        answer: "ติดต่อแอดมินผ่าน Line หรือ Discord เพื่อขอรีเซ็ตรหัสผ่าน โดยแจ้งชื่อผู้ใช้ของคุณ",
        category: "account",
        sortOrder: 1,
        isActive: true,
    },
    {
        question: "สมัครสมาชิกฟรีหรือไม่?",
        answer: "ใช่ การสมัครสมาชิกไม่มีค่าใช้จ่าย และคุณจะได้รับสิทธิพิเศษต่างๆ เมื่อเป็นสมาชิก",
        category: "account",
        sortOrder: 2,
        isActive: true,
    },
    {
        question: "ติดต่อเราได้ที่ไหน?",
        answer: "สามารถติดต่อได้ทาง:\n- Line: @gamestore\n- Discord: GameStore#1234\n- Facebook: GameStore Official",
        category: "general",
        sortOrder: 3,
        isActive: true,
    },
];

async function main() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);
    const db = drizzle(connection);

    console.log("Seeding FAQ data...");

    for (const faq of faqData) {
        await db.insert(helpArticles).values({
            id: crypto.randomUUID(),
            ...faq,
        });
        console.log(`✅ Added: ${faq.question}`);
    }

    console.log("FAQ seeding completed!");
    await connection.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
