import { mysqlNow } from "@/lib/utils/date";
import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { checkRegisterRateLimit, getClientIp } from "@/lib/rateLimit";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { parseBody } from "@/lib/api";
import { registerSchema } from "@/lib/validations";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { createEmailVerificationToken } from "@/lib/emailVerification";
import { sendEmail } from "@/lib/mail";
import { EmailVerificationEmail } from "@/components/emails/EmailVerificationEmail";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { getRegistrationPolicies, hasRegistrationPolicies } from "@/lib/getRegistrationPolicies";
import { resolveSiteName } from "@/lib/seo";

export async function POST(request: NextRequest) {
    try {
        // Check rate limit first (skip in dev mode for easier testing)
        if (process.env.NODE_ENV === "production") {
            const clientIp = getClientIp(request);
            const rateLimit = checkRegisterRateLimit(clientIp);
            if (rateLimit.blocked) {
                return NextResponse.json(
                    { success: false, message: rateLimit.message },
                    { status: 429 }
                );
            }
        }

        // Validate inputs with Zod
        const parsed = await parseBody(request, registerSchema);
        if ("error" in parsed) return parsed.error;
        const { username, email, password, pin, turnstileToken } = parsed.data;

        // Consent is only required when an admin has actually published TOS/PP
        // clauses. The client hides the checkbox in that case, so re-checking
        // here is what stops a direct POST from skipping it.
        const policies = await getRegistrationPolicies();
        if (hasRegistrationPolicies(policies) && parsed.data.acceptedPolicies !== true) {
            return NextResponse.json(
                { success: false, message: "กรุณายอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัว" },
                { status: 400 }
            );
        }
        const policiesAccepted = hasRegistrationPolicies(policies);

        const clientIp = getClientIp(request);
        const turnstileResult = await verifyTurnstileToken(turnstileToken ?? undefined, clientIp);
        if (!turnstileResult.success) {
            return NextResponse.json(
                { success: false, message: turnstileResult.message },
                { status: 400 }
            );
        }

        // Check if username already exists
        const existingUser = await db.query.users.findFirst({
            where: or(
                eq(users.username, username),
                eq(users.email, email)
            ),
        });

        if (existingUser) {
            const duplicateMessage = existingUser.username === username
                ? "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว"
                : "อีเมลนี้ถูกใช้งานแล้ว";

            return NextResponse.json(
                { success: false, message: duplicateMessage },
                { status: 400 }
            );
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newId = crypto.randomUUID();
        try {
            await db.insert(users).values({
                id: newId,
                username,
                email,
                password: hashedPassword,
                pinHash: pin ? await bcrypt.hash(pin, 12) : null,
                pinEnabledAt: pin ? mysqlNow() : null,
                pinUpdatedAt: pin ? mysqlNow() : null,
                role: "USER",
                creditBalance: "0",
                createdAt: mysqlNow(),
                updatedAt: mysqlNow(),
            });
        } catch (insertError) {
            // The findFirst check above can't stop two concurrent sign-ups with the
            // same username/email — the unique indexes are the real guard, so map
            // their violation back to the same friendly duplicate message.
            const message = insertError instanceof Error ? insertError.message : "";
            if (message.includes("Duplicate entry")) {
                return NextResponse.json(
                    {
                        success: false,
                        message: message.includes("email") ? "อีเมลนี้ถูกใช้งานแล้ว" : "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว",
                    },
                    { status: 400 }
                );
            }
            throw insertError;
        }
        const user = { id: newId, username };

        // Audit log for registration
        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.REGISTER,
            userId: user.id,
            resource: "User",
            resourceId: user.id,
            resourceName: username,
            details: {
                resourceName: username,
                // The record that this account accepted the published TOS/PP.
                acceptedPolicies: policiesAccepted,
            },
        });

        let verificationEmailSent = false;
        try {
            const { verificationUrl } = await createEmailVerificationToken({
                userId: user.id,
                email,
            });
            const siteSettings = await getSiteSettings();
            const siteName = resolveSiteName(siteSettings?.heroTitle);
            const emailResult = await sendEmail({
                to: email,
                subject: `ยืนยันอีเมล ${siteName}`,
                react: EmailVerificationEmail({
                    siteName,
                    verificationUrl,
                    recipientName: username,
                }),
            });
            verificationEmailSent = emailResult.success;
        } catch (emailError) {
            console.warn("[register] Email verification send failed", emailError);
        }

        return NextResponse.json({
            success: true,
            message: verificationEmailSent
                ? "สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี"
                : "สมัครสมาชิกสำเร็จ! เข้าสู่ระบบได้เลย และสามารถส่งอีเมลยืนยันจากหน้าข้อมูลติดต่อ",
            userId: user.id,
        });
    } catch (error) {
        console.error("Register error:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Registration failed",
            },
            { status: 500 }
        );
    }
}
