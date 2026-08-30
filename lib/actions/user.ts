"use server";

import bcrypt from "bcryptjs";
import { and, eq, ne } from "drizzle-orm";
import { auth } from "@/auth";
import { createAuditLog, AUDIT_ACTIONS, getChanges } from "@/lib/auditLog";
import { db, users } from "@/lib/db";
import { decryptUserSensitiveFields, omitClientHiddenUserFields } from "@/lib/sensitiveData";
import { MIN_PASSWORD_LENGTH, updateProfileSchema, UpdateProfileInput } from "@/lib/validations/profile";
import { verifyUserPin } from "@/lib/security/pin";

interface ActionResult {
    success: boolean;
    message: string;
    errors?: Record<string, string[]>;
    passwordChanged?: boolean;
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

/**
 * อัปเดตข้อมูลโปรไฟล์ของผู้ใช้ปัจจุบัน
 */
export async function updateProfile(formData: UpdateProfileInput): Promise<ActionResult> {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return {
                success: false,
                message: "กรุณาเข้าสู่ระบบก่อน",
            };
        }

        const validationResult = updateProfileSchema.safeParse(formData);
        if (!validationResult.success) {
            return {
                success: false,
                message: "ข้อมูลไม่ถูกต้อง",
                errors: getFieldErrors(validationResult.error.issues),
            };
        }

        const validatedData = validationResult.data;

        if ("phone" in formData && (!validatedData.phone || validatedData.phone.trim() === "")) {
            return {
                success: false,
                message: "กรุณากรอกเบอร์มือถือ",
                errors: { phone: ["กรุณากรอกเบอร์มือถือ"] },
            };
        }

        const currentUser = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: {
                id: true, name: true, email: true, phone: true, image: true, password: true,
                pinHash: true,
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: Record<string, any> = {};

        if (validatedData.name !== undefined) updateData.name = validatedData.name || null;
        if (validatedData.email !== undefined) {
            const nextEmail = validatedData.email ? validatedData.email.trim().toLowerCase() : null;
            const currentEmail = (currentUser.email ?? "").trim().toLowerCase();
            const emailIsChanging = currentEmail !== (nextEmail ?? "");

            // The address is what "forgot password" sends the reset link to, so
            // moving it is as sensitive as changing the password itself — which
            // has always asked for the current one.
            if (emailIsChanging) {
                if (!validatedData.currentPassword) {
                    return {
                        success: false,
                        message: "กรุณากรอกรหัสผ่านปัจจุบันเพื่อเปลี่ยนอีเมล",
                        errors: { currentPassword: ["กรุณากรอกรหัสผ่านปัจจุบันเพื่อเปลี่ยนอีเมล"] },
                    };
                }

                const isPasswordValid = await bcrypt.compare(validatedData.currentPassword, currentUser.password);
                if (!isPasswordValid) {
                    return {
                        success: false,
                        message: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
                        errors: { currentPassword: ["รหัสผ่านปัจจุบันไม่ถูกต้อง"] },
                    };
                }
            }

            if (nextEmail) {
                const existingEmailUser = await db.query.users.findFirst({
                    where: and(eq(users.email, nextEmail), ne(users.id, userId)),
                    columns: { id: true },
                });

                if (existingEmailUser) {
                    return {
                        success: false,
                        message: "อีเมลนี้ถูกใช้งานแล้ว",
                        errors: { email: ["อีเมลนี้ถูกใช้งานแล้ว"] },
                    };
                }
            }

            updateData.email = nextEmail;
            if (emailIsChanging) {
                updateData.emailVerified = false;
            }
        }
        if (validatedData.phone !== undefined) updateData.phone = validatedData.phone || null;
        if (validatedData.firstName !== undefined) updateData.firstName = validatedData.firstName || null;
        if (validatedData.lastName !== undefined) updateData.lastName = validatedData.lastName || null;
        if (validatedData.firstNameEn !== undefined) updateData.firstNameEn = validatedData.firstNameEn || null;
        if (validatedData.lastNameEn !== undefined) updateData.lastNameEn = validatedData.lastNameEn || null;
        if (validatedData.image !== undefined) updateData.image = validatedData.image || null;

        // Addresses are not written here. They belong to UserAddressProfile, which
        // mirrors the default one into the legacy tax*/ship* columns — two writers
        // for the same fields meant a half-finished save could leave the two
        // copies disagreeing.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const encryptedUpdateData: Record<string, any> = { ...updateData };

        if (validatedData.password && validatedData.password.length >= MIN_PASSWORD_LENGTH) {
            // Verify current password before allowing change
            if (!validatedData.currentPassword) {
                return {
                    success: false,
                    message: "กรุณากรอกรหัสผ่านปัจจุบัน",
                    errors: { currentPassword: ["กรุณากรอกรหัสผ่านปัจจุบัน"] },
                };
            }
            const isCurrentPasswordValid = await bcrypt.compare(validatedData.currentPassword, currentUser.password);
            if (!isCurrentPasswordValid) {
                return {
                    success: false,
                    message: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
                    errors: { currentPassword: ["รหัสผ่านปัจจุบันไม่ถูกต้อง"] },
                };
            }
            if (currentUser.pinHash) {
                if (!validatedData.pin) {
                    return {
                        success: false,
                        message: "กรุณากรอก PIN เพื่อยืนยันการเปลี่ยนรหัสผ่าน",
                        errors: { pin: ["กรุณากรอก PIN เพื่อยืนยันการเปลี่ยนรหัสผ่าน"] },
                    };
                }

                const pinVerification = await verifyUserPin(userId, validatedData.pin);
                if (!pinVerification.success) {
                    return {
                        success: false,
                        message: pinVerification.message,
                        errors: { pin: [pinVerification.message] },
                    };
                }
            }
            encryptedUpdateData.password = await bcrypt.hash(validatedData.password, 12);
        }

        if (Object.keys(encryptedUpdateData).length === 0) {
            return {
                success: false,
                message: "ไม่มีข้อมูลสำหรับอัปเดต",
            };
        }

        const changes = getChanges(
            {
                name: currentUser.name,
                email: currentUser.email,
                image: currentUser.image,
                password: currentUser.password,
            },
            {
                name: encryptedUpdateData.name ?? currentUser.name,
                email: encryptedUpdateData.email ?? currentUser.email,
                image: encryptedUpdateData.image ?? currentUser.image,
                password: encryptedUpdateData.password ? "[CHANGED]" : currentUser.password,
            },
            ["name", "email", "image", "password"]
        );

        await db.update(users).set(encryptedUpdateData).where(eq(users.id, userId));

        await createAuditLog({
            userId,
            action: encryptedUpdateData.password ? AUDIT_ACTIONS.PASSWORD_CHANGE : AUDIT_ACTIONS.PROFILE_UPDATE,
            resource: "User",
            resourceId: userId,
            changes: changes.map((change) => ({
                field: change.field,
                oldValue: change.field === "password" ? "[HIDDEN]" : change.oldValue,
                newValue: change.field === "password" ? "[HIDDEN]" : change.newValue,
            })),
            status: "SUCCESS",
        });

        return {
            success: true,
            message: encryptedUpdateData.password
                ? "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กรุณาเข้าสู่ระบบใหม่"
                : "อัปเดตโปรไฟล์เรียบร้อยแล้ว",
            passwordChanged: !!encryptedUpdateData.password,
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
 * ดึงข้อมูลโปรไฟล์ของผู้ใช้ปัจจุบันสำหรับแสดงผลในหน้าโปรไฟล์
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
                role: true, creditBalance: true, phoneVerified: true, emailVerified: true, pinHash: true, pinUpdatedAt: true, pinLockedUntil: true,
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
            ...omitClientHiddenUserFields(decryptUserSensitiveFields(user)),
            hasPin: Boolean(user.pinHash),
            pinUpdatedAt: user.pinUpdatedAt,
            pinLockedUntil: user.pinLockedUntil,
            creditBalance: user.creditBalance.toString(),
        };
    } catch (error) {
        console.error("Get profile error:", error);
        return null;
    }
}
