import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/auditLog";
import { mysqlNow } from "@/lib/utils/date";

export const PIN_MAX_FAILED_ATTEMPTS = 5;
export const PIN_LOCK_MINUTES = 15;

export async function hashPin(pin: string) {
    return bcrypt.hash(pin, 12);
}

export async function verifyPin(pin: string, hash: string) {
    return bcrypt.compare(pin, hash);
}

export function isPinLocked(pinLockedUntil: string | null | undefined) {
    if (!pinLockedUntil) return false;
    return new Date(pinLockedUntil).getTime() > Date.now();
}

export function buildPinLockUntilDate() {
    return new Date(Date.now() + PIN_LOCK_MINUTES * 60 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
}

export async function getUserPinStatus(userId: string) {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
            id: true,
            pinHash: true,
            pinLockedUntil: true,
        },
    });

    if (!user) {
        return { found: false, hasPin: false, isLocked: false, lockedUntil: null } as const;
    }

    return {
        found: true,
        hasPin: Boolean(user.pinHash),
        isLocked: isPinLocked(user.pinLockedUntil),
        lockedUntil: user.pinLockedUntil ?? null,
    } as const;
}

export async function verifyUserPin(userId: string, pin: string) {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
            id: true,
            pinHash: true,
            pinLockedUntil: true,
        },
    });

    if (!user) {
        return { success: false, message: "ไม่พบผู้ใช้งาน" } as const;
    }

    if (!user.pinHash) {
        return { success: true, skipped: true } as const;
    }

    if (isPinLocked(user.pinLockedUntil)) {
        return {
            success: false,
            message: "PIN ถูกล็อกชั่วคราว กรุณาลองใหม่ภายหลัง",
            lockedUntil: user.pinLockedUntil,
        } as const;
    }

    const isCurrentPinValid = await verifyPin(pin, user.pinHash);

    if (!isCurrentPinValid) {
        // Bump the failed-attempt counter under a row lock so parallel wrong-PIN
        // attempts can't all read the same baseline and slip past the lockout.
        // bcrypt already ran above, so the lock is held only for the short
        // re-read + counter write (not the slow hash compare).
        const nextFailedAttempts = await db.transaction(async (tx) => {
            const [locked] = await tx
                .select({
                    pinFailedAttempts: users.pinFailedAttempts,
                })
                .from(users)
                .where(eq(users.id, userId))
                .for("update");

            const attempts = (locked?.pinFailedAttempts ?? 0) + 1;
            await tx.update(users).set({
                pinFailedAttempts: attempts,
                pinLockedUntil: attempts >= PIN_MAX_FAILED_ATTEMPTS ? buildPinLockUntilDate() : null,
                updatedAt: mysqlNow(),
            }).where(eq(users.id, userId));

            return attempts;
        });

        await createAuditLog({
            userId,
            action: AUDIT_ACTIONS.PIN_VERIFY_FAILED,
            resource: "User",
            resourceId: userId,
            status: "FAILURE",
            details: { failedAttempts: nextFailedAttempts },
        });

        return {
            success: false,
            message: nextFailedAttempts >= PIN_MAX_FAILED_ATTEMPTS
                ? "กรอก PIN ผิดหลายครั้ง ระบบล็อกชั่วคราวแล้ว"
                : "PIN ไม่ถูกต้อง",
        } as const;
    }

    await db.update(users).set({
        pinFailedAttempts: 0,
        pinLockedUntil: null,
        updatedAt: mysqlNow(),
    }).where(eq(users.id, userId));

    return { success: true } as const;
}

export async function assertPinForProtectedAction(userId: string, pin: unknown) {
    const pinStatus = await getUserPinStatus(userId);
    if (!pinStatus.hasPin) {
        return { success: true } as const;
    }

    if (typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
        return {
            success: false,
            status: 403,
            message: "กรุณายืนยัน PIN ก่อนทำรายการ",
        } as const;
    }

    const pinVerification = await verifyUserPin(userId, pin);
    if (!pinVerification.success) {
        return {
            success: false,
            status: 403,
            message: pinVerification.message,
        } as const;
    }

    return { success: true } as const;
}
