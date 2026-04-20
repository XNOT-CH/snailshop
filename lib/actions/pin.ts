"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, users } from "@/lib/db";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/auditLog";
import { mysqlNow } from "@/lib/utils/date";
import { hashPin, verifyUserPin } from "@/lib/security/pin";
import {
    resetPinSchema,
    updatePinSchema,
    type ResetPinInput,
    type UpdatePinInput,
} from "@/lib/validations/pin";

interface PinActionResult {
    success: boolean;
    message: string;
    errors?: Record<string, string[]>;
}

function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of issues) {
        const field = String(issue.path[0] ?? "form");
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(issue.message);
    }
    return fieldErrors;
}

export async function updateUserPin(input: UpdatePinInput): Promise<PinActionResult> {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return { success: false, message: "กรุณาเข้าสู่ระบบก่อน" };
        }

        const parsed = updatePinSchema.safeParse(input);
        if (!parsed.success) {
            return {
                success: false,
                message: "ข้อมูล PIN ไม่ถูกต้อง",
                errors: toFieldErrors(parsed.error.issues),
            };
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: {
                id: true,
                password: true,
                pinHash: true,
                pinLockedUntil: true,
            },
        });

        if (!user) {
            return { success: false, message: "ไม่พบผู้ใช้งาน" };
        }

        const { currentPassword, currentPin, newPin } = parsed.data;

        if (user.pinHash) {
            const pinVerification = await verifyUserPin(userId, currentPin!);
            if (!pinVerification.success) {
                return {
                    success: false,
                    message: pinVerification.message,
                    errors: {
                        currentPin: [pinVerification.message],
                    },
                };
            }
        } else {
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword!, user.password);
            if (!isCurrentPasswordValid) {
                return {
                    success: false,
                    message: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
                    errors: { currentPassword: ["รหัสผ่านปัจจุบันไม่ถูกต้อง"] },
                };
            }
        }

        const pinUpdateData: Record<string, string | number | null> = {
            pinHash: await hashPin(newPin),
            pinUpdatedAt: mysqlNow(),
            pinFailedAttempts: 0,
            pinLockedUntil: null,
            updatedAt: mysqlNow(),
        };

        if (!user.pinHash) {
            pinUpdateData.pinEnabledAt = mysqlNow();
        }

        await db.update(users).set(pinUpdateData).where(eq(users.id, userId));

        await createAuditLog({
            userId,
            action: user.pinHash ? AUDIT_ACTIONS.PIN_CHANGED : AUDIT_ACTIONS.PIN_SET,
            resource: "User",
            resourceId: userId,
            details: { hasExistingPin: Boolean(user.pinHash) },
        });

        return {
            success: true,
            message: user.pinHash ? "เปลี่ยน PIN เรียบร้อยแล้ว" : "ตั้งค่า PIN เรียบร้อยแล้ว",
        };
    } catch (error) {
        console.error("Update pin error:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "ไม่สามารถอัปเดต PIN ได้",
        };
    }
}

export async function resetUserPin(input: ResetPinInput): Promise<PinActionResult> {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return { success: false, message: "กรุณาเข้าสู่ระบบก่อน" };
        }

        const parsed = resetPinSchema.safeParse(input);
        if (!parsed.success) {
            return {
                success: false,
                message: "ข้อมูล PIN ไม่ถูกต้อง",
                errors: toFieldErrors(parsed.error.issues),
            };
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: {
                id: true,
                password: true,
                pinHash: true,
            },
        });

        if (!user) {
            return { success: false, message: "ไม่พบผู้ใช้งาน" };
        }

        const isCurrentPasswordValid = await bcrypt.compare(parsed.data.currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return {
                success: false,
                message: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
                errors: { currentPassword: ["รหัสผ่านปัจจุบันไม่ถูกต้อง"] },
            };
        }

        await db.update(users).set({
            pinHash: await hashPin(parsed.data.newPin),
            ...(user.pinHash ? {} : { pinEnabledAt: mysqlNow() }),
            pinUpdatedAt: mysqlNow(),
            pinFailedAttempts: 0,
            pinLockedUntil: null,
            updatedAt: mysqlNow(),
        }).where(eq(users.id, userId));

        await createAuditLog({
            userId,
            action: AUDIT_ACTIONS.PIN_RESET,
            resource: "User",
            resourceId: userId,
            details: { selfService: true, hadExistingPin: Boolean(user.pinHash) },
        });

        return {
            success: true,
            message: "รีเซ็ต PIN เรียบร้อยแล้ว",
        };
    } catch (error) {
        console.error("Reset pin error:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "ไม่สามารถรีเซ็ต PIN ได้",
        };
    }
}
