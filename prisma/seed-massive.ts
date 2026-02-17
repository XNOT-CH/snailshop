import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────
const BANKS = ["KBANK", "SCB", "KTB", "BBL", "BAY", "TRUEWALLET", "PROMPTPAY", "TMB", "GSB"];
const THAI_FIRST = [
    "สมชาย", "สมหญิง", "วิชัย", "ปิยะ", "กานต์", "ณัฐ", "พิมพ์", "อรุณ", "จิรา", "ธนา",
    "กิตติ", "ศิริ", "ประภา", "สุวรรณ", "มนัส", "อนุชา", "วรรณา", "พรชัย", "นภา", "ธีระ",
    "สุภา", "ชนิดา", "ปรีชา", "เกษม", "ลัดดา", "อภิชาติ", "วิไล", "ชัยวัฒน์", "สมพร", "คมสันต์",
    "ฐิติ", "ภัทร", "กมล", "อัญชลี", "สุรชัย", "รัตนา", "วิเชียร", "พรรณี", "สิทธิ", "ดวงใจ",
    "ชัยรัตน์", "กรวิชญ์", "เบญจมาศ", "ธนวัฒน์", "มาลี", "ณัฐพล", "วิภา", "ศักดิ์ชัย", "จันทร์", "พงษ์ศักดิ์",
];
const THAI_LAST = [
    "สุขใจ", "รักดี", "มั่นคง", "ใจดี", "สว่าง", "พัฒนา", "เจริญ", "สมบูรณ์", "ศรีสุข", "วงศ์ดี",
    "ทองคำ", "ศรีทอง", "บุญมา", "พิทักษ์", "สุขสันต์", "เทพารักษ์", "เกตุทอง", "วิไลศักดิ์", "ดีงาม", "ประยูร",
    "ชาญชัย", "จิตรดี", "มงคล", "ศิริพร", "ภู่ทอง", "รุ่งเรือง", "สัมฤทธิ์", "ปานทอง", "คำแก้ว", "ทรัพย์เจริญ",
];
const EN_FIRST = [
    "Somchai", "Somying", "Wichai", "Piya", "Kan", "Nat", "Pim", "Arun", "Jira", "Thana",
    "Kitti", "Siri", "Prapha", "Suwan", "Manat", "Anucha", "Wanna", "Pornchai", "Napa", "Teera",
    "Supa", "Chanida", "Preecha", "Kasem", "Ladda", "Apichat", "Wilai", "Chaiwat", "Somporn", "Komsan",
];
const CATEGORIES = ["Steam", "PlayStation", "Nintendo", "Xbox", "Mobile", "Gift Card", "Software"];
const GAME_NAMES = [
    "GTA V", "Elden Ring", "Cyberpunk 2077", "Minecraft", "Valheim", "Stardew Valley",
    "PUBG", "FIFA 25", "Resident Evil 4", "Hogwarts Legacy", "Baldur's Gate 3",
    "Starfield", "Diablo IV", "God of War", "Spider-Man 2", "Palworld",
    "Lethal Company", "Counter-Strike 2", "Apex Legends", "Fortnite V-Bucks",
    "Roblox Robux", "Steam Wallet ฿100", "Steam Wallet ฿250", "Steam Wallet ฿500",
    "PS Store ฿500", "PS Store ฿1000", "Nintendo eShop ฿500", "Xbox Game Pass 1M",
    "Netflix Gift Card", "Spotify Premium 1M", "Discord Nitro 1M", "Valorant Points",
    "League of Legends RP", "Genshin Impact Genesis", "Mobile Legends Diamonds",
    "Free Fire Diamonds", "ROV Coupons", "PUBG Mobile UC", "Garena Shells",
    "Windows 11 Pro Key", "Office 365 Key", "Adobe Creative Cloud", "Canva Pro 1Y",
];
const STATUSES = ["COMPLETED"];
const TOPUP_STATUSES_WEIGHTS = [
    { status: "APPROVED", weight: 75 },
    { status: "PENDING", weight: 15 },
    { status: "REJECTED", weight: 10 },
];

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}
function rand(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomDate(daysAgo: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - rand(0, daysAgo));
    d.setHours(rand(6, 23), rand(0, 59), rand(0, 59), 0);
    return d;
}
function weightedPick(items: { status: string; weight: number }[]): string {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let r = Math.random() * total;
    for (const item of items) {
        r -= item.weight;
        if (r <= 0) return item.status;
    }
    return items[0].status;
}

// ─── Main ───────────────────────────────────────────────
async function main() {
    console.log("🚀 เริ่มสร้างข้อมูลทดสอบจำนวนมาก...\n");

    const hashedPassword = await bcrypt.hash("Test1234!", 10);

    // ═══════════════════════════════════════════════
    // 1. สร้างผู้ใช้ 500 คน
    // ═══════════════════════════════════════════════
    console.log("👥 กำลังสร้างผู้ใช้ 500 คน...");
    const TOTAL_USERS = 500;
    const userIds: string[] = [];
    const BATCH = 50;

    for (let batch = 0; batch < TOTAL_USERS / BATCH; batch++) {
        const users = [];
        for (let i = 0; i < BATCH; i++) {
            const idx = batch * BATCH + i;
            const fn = pick(THAI_FIRST);
            const ln = pick(THAI_LAST);
            const fnEn = pick(EN_FIRST);
            // Spread createdAt over last 90 days
            const createdAt = randomDate(90);
            users.push({
                username: `testuser${String(idx + 1).padStart(4, "0")}`,
                name: `${fn} ${ln}`,
                email: `testuser${idx + 1}@test.com`,
                password: hashedPassword,
                role: "USER",
                phone: `08${rand(10000000, 99999999)}`,
                firstName: fn,
                lastName: ln,
                firstNameEn: fnEn,
                lastNameEn: ln,
                creditBalance: 0,
                totalTopup: 0,
                pointBalance: rand(0, 500),
                createdAt,
                updatedAt: createdAt,
            });
        }
        // Use skipDuplicates in case of re-runs
        await prisma.user.createMany({ data: users, skipDuplicates: true });
        process.stdout.write(`   ✅ ${Math.min((batch + 1) * BATCH, TOTAL_USERS)}/${TOTAL_USERS}\r`);
    }

    // Collect all created user IDs
    const allUsers = await prisma.user.findMany({
        where: { username: { startsWith: "testuser" } },
        select: { id: true },
    });
    allUsers.forEach((u) => userIds.push(u.id));
    console.log(`\n   ✅ ผู้ใช้ทั้งหมด: ${userIds.length} คน\n`);

    // ═══════════════════════════════════════════════
    // 2. สร้างสินค้า ~120 รายการ
    // ═══════════════════════════════════════════════
    console.log("🎮 กำลังสร้างสินค้า...");
    const products = [];
    for (let i = 0; i < 120; i++) {
        const name = pick(GAME_NAMES);
        const price = pick([29, 49, 59, 99, 149, 199, 249, 299, 399, 499, 599, 799, 999, 1290, 1490, 1990]);
        const hasDiscount = Math.random() < 0.3;
        const discountPrice = hasDiscount ? Math.round(price * (0.5 + Math.random() * 0.3)) : null;
        products.push({
            name: `${name} ${i > GAME_NAMES.length ? `#${i}` : ""}`.trim(),
            description: `${name} - รหัสเกมดิจิทัลพร้อมใช้งาน ส่งทันทีหลังชำระเงิน`,
            price,
            discountPrice,
            imageUrl: null,
            category: pick(CATEGORIES),
            currency: Math.random() < 0.85 ? "THB" : "POINT",
            secretData: `SECRET-KEY-${Math.random().toString(36).slice(2, 14).toUpperCase()}`,
            isSold: Math.random() < 0.6,
            isFeatured: Math.random() < 0.15,
            sortOrder: i,
            createdAt: randomDate(60),
        });
    }
    await prisma.product.createMany({ data: products as any });
    console.log(`   ✅ สินค้า ${products.length} รายการ\n`);

    // ═══════════════════════════════════════════════
    // 3. สร้าง Orders ~800 รายการ (กระจาย 90 วัน)
    // ═══════════════════════════════════════════════
    console.log("🛒 กำลังสร้างคำสั่งซื้อ...");
    const orders = [];
    const ORDER_COUNT = 800;
    for (let i = 0; i < ORDER_COUNT; i++) {
        const price = pick([29, 49, 59, 99, 149, 199, 249, 299, 399, 499, 599, 799, 999]);
        orders.push({
            userId: pick(userIds),
            totalPrice: price,
            status: "COMPLETED",
            givenData: `REDEEMED-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
            purchasedAt: randomDate(90),
        });
    }
    // Batch insert orders
    const ORDER_BATCH = 100;
    for (let b = 0; b < orders.length; b += ORDER_BATCH) {
        await prisma.order.createMany({ data: orders.slice(b, b + ORDER_BATCH) });
        process.stdout.write(`   ✅ คำสั่งซื้อ ${Math.min(b + ORDER_BATCH, orders.length)}/${ORDER_COUNT}\r`);
    }
    console.log(`\n   ✅ คำสั่งซื้อ ${orders.length} รายการ\n`);

    // ═══════════════════════════════════════════════
    // 4. สร้าง Topups ~1200 รายการ (กระจาย 90 วัน)
    // ═══════════════════════════════════════════════
    console.log("💰 กำลังสร้างรายการเติมเงิน...");
    const topups = [];
    const TOPUP_COUNT = 1200;
    for (let i = 0; i < TOPUP_COUNT; i++) {
        const amount = pick([50, 100, 100, 200, 200, 300, 500, 500, 1000, 1000, 2000, 3000, 5000]);
        const status = weightedPick(TOPUP_STATUSES_WEIGHTS);
        const fn = pick(THAI_FIRST);
        const ln = pick(THAI_LAST);
        topups.push({
            userId: pick(userIds),
            amount,
            status,
            senderBank: pick(BANKS),
            senderName: `${fn} ${ln}`,
            receiverBank: pick(["KBANK", "SCB"]),
            receiverName: "ManaShop",
            transactionRef: `TXN-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
            rejectReason: status === "REJECTED" ? pick(["สลิปไม่ชัด", "ยอดไม่ตรง", "สลิปซ้ำ", "หมดเวลา"]) : null,
            createdAt: randomDate(90),
        });
    }
    const TOPUP_BATCH = 100;
    for (let b = 0; b < topups.length; b += TOPUP_BATCH) {
        await prisma.topup.createMany({ data: topups.slice(b, b + TOPUP_BATCH) });
        process.stdout.write(`   ✅ เติมเงิน ${Math.min(b + TOPUP_BATCH, topups.length)}/${TOPUP_COUNT}\r`);
    }
    console.log(`\n   ✅ เติมเงิน ${topups.length} รายการ\n`);

    // ═══════════════════════════════════════════════
    // 5. อัปเดต creditBalance & totalTopup ของ user
    // ═══════════════════════════════════════════════
    console.log("📊 กำลังอัปเดตยอดเงินผู้ใช้...");
    // Aggregate approved topups per user
    const approvedByUser = new Map<string, number>();
    for (const t of topups) {
        if (t.status === "APPROVED") {
            approvedByUser.set(t.userId, (approvedByUser.get(t.userId) || 0) + t.amount);
        }
    }
    // Aggregate order spend per user
    const spentByUser = new Map<string, number>();
    for (const o of orders) {
        spentByUser.set(o.userId, (spentByUser.get(o.userId) || 0) + o.totalPrice);
    }
    // Update users
    let updatedCount = 0;
    for (const [userId, totalTopup] of approvedByUser) {
        const spent = spentByUser.get(userId) || 0;
        const balance = Math.max(totalTopup - spent, 0);
        await prisma.user.update({
            where: { id: userId },
            data: {
                totalTopup,
                creditBalance: balance,
            },
        });
        updatedCount++;
        if (updatedCount % 50 === 0) {
            process.stdout.write(`   ✅ อัปเดต ${updatedCount} คน\r`);
        }
    }
    console.log(`   ✅ อัปเดตยอดเงิน ${updatedCount} คน\n`);

    // ═══════════════════════════════════════════════
    // สรุป
    // ═══════════════════════════════════════════════
    const totalApproved = topups.filter((t) => t.status === "APPROVED").reduce((s, t) => s + t.amount, 0);
    const totalPending = topups.filter((t) => t.status === "PENDING").length;
    const totalRejected = topups.filter((t) => t.status === "REJECTED").length;
    const totalOrderRevenue = orders.reduce((s, o) => s + o.totalPrice, 0);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 สรุปข้อมูลทดสอบ:");
    console.log(`   👥 ผู้ใช้: ${userIds.length} คน`);
    console.log(`   🎮 สินค้า: ${products.length} รายการ`);
    console.log(`   🛒 คำสั่งซื้อ: ${orders.length} รายการ (฿${totalOrderRevenue.toLocaleString()})`);
    console.log(`   💰 เติมเงิน APPROVED: ${topups.filter(t => t.status === "APPROVED").length} (฿${totalApproved.toLocaleString()})`);
    console.log(`   ⏳ เติมเงิน PENDING: ${totalPending}`);
    console.log(`   ❌ เติมเงิน REJECTED: ${totalRejected}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🎉 เสร็จสิ้น! Dashboard พร้อมใช้งาน");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
