"use server";

import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { createAuditLog, AUDIT_ACTIONS, getChanges } from "@/lib/auditLog";
import { updateProfileSchema, UpdateProfileInput } from "@/lib/validations/profile";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";

interface ActionResult {
    success: boolean;
    message: string;
    errors?: Record<string, string[]>;
}

// Helpers to reduce cognitive complexity
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getFieldErrors(issues: any[]) {
    const fieldErrors: Record<string, string[]> = {};
    for (const error of issues) {
        const field = error.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(error.message);
    }
    return fieldErrors;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTaxAddress(taxAddress: any, updateData: any) {
    if (!taxAddress) return;
    updateData.taxFullName = taxAddress.fullName || null;
    updateData.taxPhone = taxAddress.phone || null;
    updateData.taxAddress = taxAddress.address || null;
    updateData.taxProvince = taxAddress.province || null;
    updateData.taxDistrict = taxAddress.district || null;
    updateData.taxSubdistrict = taxAddress.subdistrict || null;
    updateData.taxPostalCode = taxAddress.postalCode || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapShippingAddress(shippingAddress: any, updateData: any) {
    if (!shippingAddress) return;
    updateData.shipFullName = shippingAddress.fullName || null;
    updateData.shipPhone = shippingAddress.phone || null;
    updateData.shipAddress = shippingAddress.address || null;
    updateData.shipProvince = shippingAddress.province || null;
    updateData.shipDistrict = shippingAddress.district || null;
    updateData.shipSubdistrict = shippingAddress.subdistrict || null;
    updateData.shipPostalCode = shippingAddress.postalCode || null;
}

/**
 * อัปเดตโปรไฟล์ผู้ใช้
 */
export async function updateProfile(formData: UpdateProfileInput): Promise<ActionResult> {
    try {
        // ตรวจสอบ authentication
        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return {
                success: false,
                message: "กรุณาเข้าสู่ระบบก่อน",
            };
        }

        // Validate ข้อมูลด้วย Zod
        const validationResult = updateProfileSchema.safeParse(formData);
        if (!validationResult.success) {
            return {
                success: false,
                message: "ข้อมูลไม่ถูกต้อง",
                errors: getFieldErrors(validationResult.error.issues),
            };
        }

        const validatedData = validationResult.data;

        // ดึงข้อมูลผู้ใช้ปัจจุบัน
        const currentUser = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: {
                id: true, name: true, email: true, phone: true, image: true, password: true,
                firstName: true, lastName: true, firstNameEn: true, lastNameEn: true,
                taxFullName: true, taxPhone: true, taxAddress: true, taxProvince: true,
                taxDistrict: true, taxSubdistrict: true, taxPostalCode: true,
                shipFullName: true, shipPhone: true, shipAddress: true, shipProvince: true,
                shipDistrict: true, shipSubdistrict: true, shipPostalCode: true,
            },
        });

        if (!currentUser) {
            return {
                success: false,
                message: "ไม่พบผู้ใช้งาน",
            };
        }

        // เตรียมข้อมูลสำหรับอัปเดต
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: Record<string, any> = {};

        if (validatedData.name !== undefined) {
            updateData.name = validatedData.name || null;
        }
        if (validatedData.email !== undefined) {
            updateData.email = validatedData.email || null;
        }
        if (validatedData.phone !== undefined) {
            updateData.phone = validatedData.phone || null;
        }
        if (validatedData.firstName !== undefined) {
            updateData.firstName = validatedData.firstName || null;
        }
        if (validatedData.lastName !== undefined) {
            updateData.lastName = validatedData.lastName || null;
        }
        if (validatedData.firstNameEn !== undefined) {
            updateData.firstNameEn = validatedData.firstNameEn || null;
        }
        if (validatedData.lastNameEn !== undefined) {
            updateData.lastNameEn = validatedData.lastNameEn || null;
        }

        // อัปเดต image ถ้ามีการส่งมา
        if (validatedData.image !== undefined) {
            updateData.image = validatedData.image || null;
        }

        mapTaxAddress(validatedData.taxAddress, updateData);
        mapShippingAddress(validatedData.shippingAddress, updateData);

        // อัปเดต password ถ้ากรอกมา
        if (validatedData.password && validatedData.password.length >= 6) {
            updateData.password = await bcrypt.hash(validatedData.password, 12);
        }

        if (Object.keys(updateData).length === 0) {
            return {
                success: false,
                message: "ไม่มีข้อมูลสำหรับอัปเดต",
            };
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
                name: updateData.name ?? currentUser.name,
                email: updateData.email ?? currentUser.email,
                image: updateData.image ?? currentUser.image,
                // ซ่อน password จาก audit log
                password: updateData.password ? "[CHANGED]" : currentUser.password,
            },
            ["name", "email", "image", "password"]
        );

        // อัปเดตข้อมูลใน database
        await db.update(users).set(updateData).where(eq(users.id, userId));

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
        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return null;
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: {
                id: true, name: true, username: true, email: true, phone: true, image: true,
                role: true, creditBalance: true, phoneVerified: true, emailVerified: true,
                firstName: true, lastName: true, firstNameEn: true, lastNameEn: true,
                taxFullName: true, taxPhone: true, taxAddress: true, taxProvince: true,
                taxDistrict: true, taxSubdistrict: true, taxPostalCode: true,
                shipFullName: true, shipPhone: true, shipAddress: true, shipProvince: true,
                shipDistrict: true, shipSubdistrict: true, shipPostalCode: true, createdAt: true,
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
