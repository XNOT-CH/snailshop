"use server";

import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/auditLog";
import { db, userAddressProfiles, users } from "@/lib/db";
import {
    decryptAddressProfileSensitiveFields,
    encryptAddressProfileSensitiveFields,
    encryptUserSensitiveFields,
} from "@/lib/sensitiveData";
import { addressProfileSchema } from "@/lib/validations/profile";

type AddressProfileKind = "tax" | "shipping" | "both";

export interface AddressProfileData {
    id: string;
    label: string;
    kind: AddressProfileKind;
    fullName: string | null;
    phone: string | null;
    address: string | null;
    province: string | null;
    district: string | null;
    subdistrict: string | null;
    postalCode: string | null;
    taxId: string | null;
    isDefaultTax: boolean;
    isDefaultShipping: boolean;
    createdAt: string;
    updatedAt: string;
}

interface ActionResult<T = undefined> {
    success: boolean;
    message: string;
    data?: T;
    errors?: Record<string, string[]>;
}

function getFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
    const fieldErrors: Record<string, string[]> = {};
    for (const error of issues) {
        const field = String(error.path[0] ?? "form");
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(error.message);
    }
    return fieldErrors;
}

async function requireUserId() {
    const session = await auth();
    return session?.user?.id ?? null;
}

function canUseForTax(kind: AddressProfileKind) {
    return kind === "tax" || kind === "both";
}

function canUseForShipping(kind: AddressProfileKind) {
    return kind === "shipping" || kind === "both";
}

function mapProfileToLegacyTax(profile: {
    fullName?: string | null;
    phone?: string | null;
    address?: string | null;
    province?: string | null;
    district?: string | null;
    subdistrict?: string | null;
    postalCode?: string | null;
}) {
    return {
        taxFullName: profile.fullName || null,
        taxPhone: profile.phone || null,
        taxAddress: profile.address || null,
        taxProvince: profile.province || null,
        taxDistrict: profile.district || null,
        taxSubdistrict: profile.subdistrict || null,
        taxPostalCode: profile.postalCode || null,
    };
}

function mapProfileToLegacyShipping(profile: {
    fullName?: string | null;
    phone?: string | null;
    address?: string | null;
    province?: string | null;
    district?: string | null;
    subdistrict?: string | null;
    postalCode?: string | null;
}) {
    return {
        shipFullName: profile.fullName || null,
        shipPhone: profile.phone || null,
        shipAddress: profile.address || null,
        shipProvince: profile.province || null,
        shipDistrict: profile.district || null,
        shipSubdistrict: profile.subdistrict || null,
        shipPostalCode: profile.postalCode || null,
    };
}

function toAddressProfileData(record: Record<string, unknown>): AddressProfileData {
    const decrypted = decryptAddressProfileSensitiveFields(record) as Record<string, unknown>;

    return {
        id: String(decrypted.id),
        label: String(decrypted.label ?? ""),
        kind: decrypted.kind as AddressProfileKind,
        fullName: (decrypted.fullName as string | null) ?? null,
        phone: (decrypted.phone as string | null) ?? null,
        address: (decrypted.address as string | null) ?? null,
        province: (decrypted.province as string | null) ?? null,
        district: (decrypted.district as string | null) ?? null,
        subdistrict: (decrypted.subdistrict as string | null) ?? null,
        postalCode: (decrypted.postalCode as string | null) ?? null,
        taxId: (decrypted.taxId as string | null) ?? null,
        isDefaultTax: Boolean(decrypted.isDefaultTax),
        isDefaultShipping: Boolean(decrypted.isDefaultShipping),
        createdAt: String(decrypted.createdAt ?? ""),
        updatedAt: String(decrypted.updatedAt ?? ""),
    };
}

async function clearOtherDefaults(userId: string, id: string, isDefaultTax: boolean, isDefaultShipping: boolean) {
    if (isDefaultTax) {
        await db
            .update(userAddressProfiles)
            .set({ isDefaultTax: false })
            .where(and(eq(userAddressProfiles.userId, userId), eq(userAddressProfiles.isDefaultTax, true)));
    }

    if (isDefaultShipping) {
        await db
            .update(userAddressProfiles)
            .set({ isDefaultShipping: false })
            .where(and(eq(userAddressProfiles.userId, userId), eq(userAddressProfiles.isDefaultShipping, true)));
    }

    return id;
}

async function syncLegacyDefaults(
    userId: string,
    profile: {
        kind: AddressProfileKind;
        fullName?: string | null;
        phone?: string | null;
        address?: string | null;
        province?: string | null;
        district?: string | null;
        subdistrict?: string | null;
        postalCode?: string | null;
        isDefaultTax?: boolean;
        isDefaultShipping?: boolean;
    },
) {
    const legacyUpdate: Record<string, string | null> = {};

    if (profile.isDefaultTax && canUseForTax(profile.kind)) {
        Object.assign(legacyUpdate, mapProfileToLegacyTax(profile));
    }

    if (profile.isDefaultShipping && canUseForShipping(profile.kind)) {
        Object.assign(legacyUpdate, mapProfileToLegacyShipping(profile));
    }

    if (Object.keys(legacyUpdate).length === 0) return;

    await db
        .update(users)
        .set(encryptUserSensitiveFields(legacyUpdate))
        .where(eq(users.id, userId));
}

export async function getUserAddressProfiles(): Promise<ActionResult<AddressProfileData[]>> {
    try {
        const userId = await requireUserId();
        if (!userId) {
            return { success: false, message: "กรุณาเข้าสู่ระบบก่อน" };
        }

        const records = await db.query.userAddressProfiles.findMany({
            where: eq(userAddressProfiles.userId, userId),
            orderBy: [desc(userAddressProfiles.isDefaultTax), desc(userAddressProfiles.isDefaultShipping), desc(userAddressProfiles.createdAt)],
        });

        return {
            success: true,
            message: "โหลดข้อมูลที่อยู่เรียบร้อยแล้ว",
            data: records.map((record) => toAddressProfileData(record as Record<string, unknown>)),
        };
    } catch (error) {
        console.error("Get address profiles error:", error);
        return { success: false, message: "ไม่สามารถโหลดข้อมูลที่อยู่ได้" };
    }
}

// A "use server" file may only export async functions, so this stays local.
// One account does not need more than this, and it bounds writes from a client.
const MAX_ADDRESS_PROFILES = 20;

export async function saveUserAddressProfile(input: unknown): Promise<ActionResult<AddressProfileData>> {
    try {
        const userId = await requireUserId();
        if (!userId) {
            return { success: false, message: "กรุณาเข้าสู่ระบบก่อน" };
        }

        const validationResult = addressProfileSchema.safeParse(input);
        if (!validationResult.success) {
            return {
                success: false,
                message: "ข้อมูลไม่ถูกต้อง",
                errors: getFieldErrors(validationResult.error.issues),
            };
        }

        const validated = validationResult.data;
        const id = validated.id || crypto.randomUUID();
        const kind = validated.kind;
        const isDefaultTax = canUseForTax(kind) ? Boolean(validated.isDefaultTax) : false;
        const isDefaultShipping = canUseForShipping(kind) ? Boolean(validated.isDefaultShipping) : false;
        const plainProfile = {
            label: validated.label,
            kind,
            fullName: validated.fullName || null,
            phone: validated.phone || null,
            address: validated.address || null,
            province: validated.province || null,
            district: validated.district || null,
            subdistrict: validated.subdistrict || null,
            postalCode: validated.postalCode || null,
            taxId: canUseForTax(kind) ? validated.taxId || null : null,
            isDefaultTax,
            isDefaultShipping,
        };
        const encryptedProfile = encryptAddressProfileSensitiveFields(plainProfile);

        if (validated.id) {
            const existing = await db.query.userAddressProfiles.findFirst({
                where: and(eq(userAddressProfiles.id, validated.id), eq(userAddressProfiles.userId, userId)),
            });

            if (!existing) {
                return { success: false, message: "ไม่พบข้อมูลที่อยู่" };
            }
        } else {
            const saved = await db.query.userAddressProfiles.findMany({
                where: eq(userAddressProfiles.userId, userId),
                columns: { id: true },
            });

            if (saved.length >= MAX_ADDRESS_PROFILES) {
                return {
                    success: false,
                    message: `บันทึกที่อยู่ได้สูงสุด ${MAX_ADDRESS_PROFILES} รายการ กรุณาลบรายการที่ไม่ใช้แล้วก่อน`,
                };
            }
        }

        await clearOtherDefaults(userId, id, isDefaultTax, isDefaultShipping);

        if (validated.id) {
            await db
                .update(userAddressProfiles)
                .set(encryptedProfile)
                .where(and(eq(userAddressProfiles.id, validated.id), eq(userAddressProfiles.userId, userId)));
        } else {
            await db.insert(userAddressProfiles).values({
                id,
                userId,
                ...encryptedProfile,
            });
        }

        await syncLegacyDefaults(userId, { ...plainProfile, kind });

        await createAuditLog({
            userId,
            action: AUDIT_ACTIONS.PROFILE_UPDATE,
            resource: "UserAddressProfile",
            resourceId: id,
            status: "SUCCESS",
        });

        const saved = await db.query.userAddressProfiles.findFirst({
            where: and(eq(userAddressProfiles.id, id), eq(userAddressProfiles.userId, userId)),
        });

        if (!saved) {
            return { success: false, message: "ไม่สามารถโหลดข้อมูลที่บันทึกได้" };
        }

        return {
            success: true,
            message: "บันทึกข้อมูลที่อยู่เรียบร้อยแล้ว",
            data: toAddressProfileData(saved as Record<string, unknown>),
        };
    } catch (error) {
        console.error("Save address profile error:", error);
        return { success: false, message: "ไม่สามารถบันทึกข้อมูลที่อยู่ได้" };
    }
}

export async function deleteUserAddressProfile(id: string): Promise<ActionResult<{ id: string }>> {
    try {
        const userId = await requireUserId();
        if (!userId) {
            return { success: false, message: "กรุณาเข้าสู่ระบบก่อน" };
        }

        const existing = await db.query.userAddressProfiles.findFirst({
            where: and(eq(userAddressProfiles.id, id), eq(userAddressProfiles.userId, userId)),
        });

        if (!existing) {
            return { success: false, message: "ไม่พบข้อมูลที่อยู่" };
        }

        await db
            .delete(userAddressProfiles)
            .where(and(eq(userAddressProfiles.id, id), eq(userAddressProfiles.userId, userId)));

        await createAuditLog({
            userId,
            action: AUDIT_ACTIONS.PROFILE_UPDATE,
            resource: "UserAddressProfile",
            resourceId: id,
            status: "SUCCESS",
        });

        return {
            success: true,
            message: "ลบข้อมูลที่อยู่เรียบร้อยแล้ว",
            data: { id },
        };
    } catch (error) {
        console.error("Delete address profile error:", error);
        return { success: false, message: "ไม่สามารถลบข้อมูลที่อยู่ได้" };
    }
}
