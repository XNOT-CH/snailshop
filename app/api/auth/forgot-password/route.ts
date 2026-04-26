import { NextRequest, NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { parseBody } from "@/lib/api";
import { forgotPasswordSchema } from "@/lib/validations";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { createPasswordResetToken, buildPasswordResetUrl } from "@/lib/passwordReset";
import { sendEmail } from "@/lib/mail";
import { PasswordResetEmail } from "@/components/emails/PasswordResetEmail";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { resolveSiteName } from "@/lib/seo";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { getClientIp } from "@/lib/rateLimit";

const GENERIC_RESET_MESSAGE =
    "หากบัญชีนี้มีอีเมลที่ใช้งานได้ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้ภายในไม่กี่นาที";

export async function POST(request: NextRequest) {
    try {
        const parsed = await parseBody(request, forgotPasswordSchema);
        if ("error" in parsed) return parsed.error;

        const identifier = parsed.data.identifier.trim();
        const clientIp = getClientIp(request);
        const turnstileResult = await verifyTurnstileToken(parsed.data.turnstileToken ?? undefined, clientIp);
        if (!turnstileResult.success) {
            return NextResponse.json(
                { success: false, message: turnstileResult.message },
                { status: 400 }
            );
        }

        const user = await db.query.users.findFirst({
            where: or(
                eq(users.email, identifier),
                eq(users.username, identifier)
            ),
            columns: {
                id: true,
                username: true,
                name: true,
                email: true,
                password: true,
            },
        });

        if (!user?.email) {
            return NextResponse.json({ success: true, message: GENERIC_RESET_MESSAGE });
        }

        const token = createPasswordResetToken({
            userId: user.id,
            passwordHash: user.password,
        });
        const resetUrl = buildPasswordResetUrl(token);
        const siteSettings = await getSiteSettings();
        const siteName = resolveSiteName(siteSettings?.heroTitle);

        const emailResult = await sendEmail({
            to: user.email,
            subject: `รีเซ็ตรหัสผ่าน ${siteName}`,
            react: PasswordResetEmail({
                siteName,
                resetUrl,
                recipientName: user.name ?? user.username,
            }),
        });

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST,
            userId: user.id,
            resource: "User",
            resourceId: user.id,
            resourceName: user.username,
            status: emailResult.success ? "SUCCESS" : "FAILURE",
            details: {
                delivery: emailResult.success ? "email" : "skipped",
            },
        });

        if (!emailResult.success) {
            console.warn("[forgot-password] Email delivery skipped or failed", {
                userId: user.id,
                email: user.email,
                resetUrl,
            });
        }

        return NextResponse.json({ success: true, message: GENERIC_RESET_MESSAGE });
    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json(
            { success: false, message: "ส่งคำขอรีเซ็ตรหัสผ่านไม่สำเร็จ" },
            { status: 500 }
        );
    }
}
