import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { EmailVerificationEmail } from "@/components/emails/EmailVerificationEmail";
import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { createEmailVerificationToken } from "@/lib/emailVerification";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { sendEmail } from "@/lib/mail";
import { checkEmailVerificationRequestRateLimitShared, getClientIp } from "@/lib/rateLimit";
import { resolveSiteName } from "@/lib/seo";

export async function POST(request: NextRequest) {
    try {
        const authCheck = await isAuthenticatedWithCsrf(request);
        const userId = authCheck.userId;

        if (!authCheck.success || !userId) {
            return NextResponse.json(
                { success: false, message: authCheck.error ?? "กรุณาเข้าสู่ระบบก่อน" },
                { status: 401 }
            );
        }

        const clientIp = getClientIp(request);
        const rateLimit = await checkEmailVerificationRequestRateLimitShared(`${clientIp}:${userId}`);
        if (rateLimit.blocked) {
            return NextResponse.json(
                { success: false, message: rateLimit.message ?? "ส่งอีเมลยืนยันบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
                { status: 429 }
            );
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: {
                id: true,
                username: true,
                name: true,
                email: true,
                emailVerified: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, message: "ไม่พบผู้ใช้งาน" },
                { status: 404 }
            );
        }

        if (!user.email) {
            return NextResponse.json(
                { success: false, message: "กรุณาเพิ่มอีเมลก่อนส่งอีเมลยืนยัน" },
                { status: 400 }
            );
        }

        if (user.emailVerified) {
            return NextResponse.json({
                success: true,
                message: "อีเมลนี้ได้รับการยืนยันแล้ว",
            });
        }

        const { verificationUrl } = await createEmailVerificationToken({
            userId: user.id,
            email: user.email,
        });
        const siteSettings = await getSiteSettings();
        const siteName = resolveSiteName(siteSettings?.heroTitle);
        const emailResult = await sendEmail({
            to: user.email,
            subject: `ยืนยันอีเมล ${siteName}`,
            react: EmailVerificationEmail({
                siteName,
                verificationUrl,
                recipientName: user.name ?? user.username,
            }),
        });

        if (!emailResult.success) {
            return NextResponse.json(
                { success: false, message: "ส่งอีเมลยืนยันไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าอีเมล" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "ส่งอีเมลยืนยันแล้ว กรุณาตรวจสอบกล่องจดหมายของคุณ",
        });
    } catch (error) {
        console.error("Send verification email error:", error);
        return NextResponse.json(
            { success: false, message: "ส่งอีเมลยืนยันไม่สำเร็จ" },
            { status: 500 }
        );
    }
}
