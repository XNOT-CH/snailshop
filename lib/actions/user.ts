"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createAuditLog, AUDIT_ACTIONS, getChanges } from "@/lib/auditLog";
import { updateProfileSchema, UpdateProfileInput } from "@/lib/validations/profile";

interface ActionResult {
    success: boolean;
    message: string;
    errors?: Record<string, string[]>;
}

/**
 * อัปเดตโปรไฟล์ผู้ใช้
 */
export async function updateProfile(formData: UpdateProfileInput): Promise<ActionResult> {
    try {
        // ตรวจสอบ authentication
        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value;

        if (!userId) {
            return {
                success: false,
                message: "กรุณาเข้าสู่ระบบก่อน",
            };
        }

        // Validate ข้อมูลด้วย Zod
        const validationResult = updateProfileSchema.safeParse(formData);
        if (!validationResult.success) {
            const fieldErrors: Record<string, string[]> = {};
            for (const error of validationResult.error.issues) {
                const field = error.path[0] as string;
                if (!fieldErrors[field]) {
                    fieldErrors[field] = [];
                }
                fieldErrors[field].push(error.message);
            }
            return {
                success: false,
                message: "ข้อมูลไม่ถูกต้อง",
                errors: fieldErrors,
            };
        }

        const validatedData = validationResult.data;

        // ดึงข้อมูลผู้ใช้ปัจจุบัน
        const currentUser = await db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                password: true,
            },
        });

        if (!currentUser) {
            return {
                success: false,
                message: "ไม่พบผู้ใช้งาน",
            };
        }

        // เตรียมข้อมูลสำหรับอัปเดต
        const updateData: {
            name: string;
            email: string | null;
            image?: string | null;
            password?: string;
        } = {
            name: validatedData.name,
            email: validatedData.email || null,
        };

        // อัปเดต image ถ้ามีการส่งมา
        if (validatedData.image !== undefined) {
            updateData.image = validatedData.image || null;
        }

        // อัปเดต password ถ้ากรอกมา
        if (validatedData.password && validatedData.password.length >= 6) {
            // Note: ใน production ควร hash password ด้วย bcrypt
            updateData.password = validatedData.password;
        }

        // Track changes สำหรับ audit log
        const changes = getChanges(
            {
                name: currentUser.name,
                email: currentUser.email,
                image: currentUser.image,
                password: currentUser.password,
            },
            {
                name: updateData.name,
                email: updateData.email,
                image: updateData.image,
                // ซ่อน password จาก audit log
                password: updateData.password ? "[CHANGED]" : currentUser.password,
            },
            ["name", "email", "image", "password"]
        );

        // อัปเดตข้อมูลใน database
        await db.user.update({
            where: { id: userId },
            data: updateData,
        });

        // บันทึก Audit Log
        await createAuditLog({
            userId,
            action: AUDIT_ACTIONS.PROFILE_UPDATE,
            resource: "User",
            resourceId: userId,
            changes: changes.map(c => ({
                field: c.field,
                oldValue: c.field === "password" ? "[HIDDEN]" : c.oldValue,
                newValue: c.field === "password" ? "[HIDDEN]" : c.newValue,
            })),
            status: "SUCCESS",
        });

        return {
            success: true,
            message: updateData.password
                ? "อัปเดตโปรไฟล์และรหัสผ่านเรียบร้อยแล้ว"
                : "อัปเดตโปรไฟล์เรียบร้อยแล้ว",
        };
    } catch (error) {
        console.error("Update profile error:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์",
        };
    }
}

/**
 * ดึงข้อมูลโปรไฟล์ผู้ใช้ปัจจุบัน
 */
export async function getCurrentUserProfile() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value;

        if (!userId) {
            return null;
        }

        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                image: true,
                role: true,
                creditBalance: true,
                createdAt: true,
            },
        });

        if (!user) {
            return null;
        }

        return {
            ...user,
            creditBalance: user.creditBalance.toString(),
        };
    } catch (error) {
        console.error("Get profile error:", error);
        return null;
    }
}
