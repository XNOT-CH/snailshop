import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value;

        if (!userId) {
            return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: {
                id: true, name: true, username: true, email: true, phone: true,
                image: true, role: true, creditBalance: true, phoneVerified: true,
                emailVerified: true, firstName: true, lastName: true, firstNameEn: true,
                lastNameEn: true, taxFullName: true, taxPhone: true, taxAddress: true,
                taxProvince: true, taxDistrict: true, taxSubdistrict: true, taxPostalCode: true,
                shipFullName: true, shipPhone: true, shipAddress: true, shipProvince: true,
                shipDistrict: true, shipSubdistrict: true, shipPostalCode: true, createdAt: true,
            },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้งาน" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: { ...user, creditBalance: String(user.creditBalance) },
        });
    } catch (error) {
        console.error("Get profile error:", error);
        return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
