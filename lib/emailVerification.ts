import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db, emailVerificationTokens, users } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import { mysqlNow, toMySQLDatetime } from "@/lib/utils/date";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

function hashEmailVerificationToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

function tokenHashesMatch(token: string, expectedHash: string) {
    const providedHash = hashEmailVerificationToken(token);
    return (
        providedHash.length === expectedHash.length &&
        timingSafeEqual(Buffer.from(providedHash), Buffer.from(expectedHash))
    );
}

export async function createEmailVerificationToken({
    userId,
    email,
    now = Date.now(),
}: {
    userId: string;
    email: string;
    now?: number;
}) {
    const normalizedEmail = email.trim().toLowerCase();
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashEmailVerificationToken(token);
    const expiresAt = toMySQLDatetime(new Date(now + EMAIL_VERIFICATION_TTL_MS));

    await db
        .update(emailVerificationTokens)
        .set({ usedAt: mysqlNow() })
        .where(and(
            eq(emailVerificationTokens.userId, userId),
            eq(emailVerificationTokens.email, normalizedEmail),
            isNull(emailVerificationTokens.usedAt),
        ));

    await db.insert(emailVerificationTokens).values({
        id: randomUUID(),
        userId,
        email: normalizedEmail,
        tokenHash,
        expiresAt,
        createdAt: mysqlNow(),
    });

    return {
        token,
        expiresAt,
        verificationUrl: buildEmailVerificationUrl(token),
    };
}

export async function verifyEmailVerificationToken(token: string, now = Date.now()) {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
        return { success: false as const, message: "ลิงก์ยืนยันอีเมลไม่ถูกต้อง" };
    }

    const tokenHash = hashEmailVerificationToken(trimmedToken);
    const tokenRecord = await db.query.emailVerificationTokens.findFirst({
        where: eq(emailVerificationTokens.tokenHash, tokenHash),
    });

    if (!tokenRecord || !tokenHashesMatch(trimmedToken, tokenRecord.tokenHash)) {
        return { success: false as const, message: "ลิงก์ยืนยันอีเมลไม่ถูกต้อง" };
    }

    if (tokenRecord.usedAt) {
        return { success: false as const, message: "ลิงก์นี้ถูกใช้งานแล้ว" };
    }

    if (new Date(tokenRecord.expiresAt).getTime() < now) {
        return { success: false as const, message: "ลิงก์ยืนยันอีเมลหมดอายุแล้ว" };
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, tokenRecord.userId),
        columns: {
            id: true,
            email: true,
        },
    });

    if (!user?.email || user.email.trim().toLowerCase() !== tokenRecord.email) {
        return { success: false as const, message: "อีเมลในบัญชีไม่ตรงกับลิงก์ยืนยันนี้" };
    }

    await db.update(users).set({
        emailVerified: true,
        updatedAt: mysqlNow(),
    }).where(eq(users.id, tokenRecord.userId));

    await db.update(emailVerificationTokens).set({
        usedAt: mysqlNow(),
    }).where(eq(emailVerificationTokens.id, tokenRecord.id));

    return { success: true as const, message: "ยืนยันอีเมลสำเร็จ" };
}

export function buildEmailVerificationUrl(token: string) {
    return absoluteUrl(`/verify-email?token=${encodeURIComponent(token)}`);
}
