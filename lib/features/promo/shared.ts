import { mysqlNow } from "@/lib/utils/date";
import type { PromoCodeInput } from "@/lib/validations/promoCode";

type PromoRecordInput = Record<string, unknown>;

export interface PromoUpdateInput {
    code?: string;
    codeType?: string;
    discountType?: string;
    discountValue?: string | number | null;
    minPurchase?: string | number | null;
    maxDiscount?: string | number | null;
    usageLimit?: string | number | null;
    usagePerUser?: string | number | null;
    startsAt?: string | Date | null;
    expiresAt?: string | Date | null;
    applicableCategories?: string[] | null;
    excludedCategories?: string[] | null;
    isNewUserOnly?: boolean;
    isActive?: boolean;
}

export function toMySQLDatetime(value: Date) {
    return value.toISOString().slice(0, 19).replace("T", " ");
}

export function parseOptionalDecimal(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") return null;
    return String(Number.parseFloat(String(value)));
}

export function parseOptionalPositiveDecimal(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number.parseFloat(String(value));
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return String(parsed);
}

export function parseOptionalInt(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeCategoryList(categories: string[] | null | undefined) {
    return (categories ?? []).map((category) => category.trim().toUpperCase());
}

export function serializePromo(code: PromoRecordInput) {
    return {
        ...code,
        codeType: typeof code.codeType === "string" ? code.codeType : "DISCOUNT",
        discountValue: Number(code.discountValue),
        minPurchase: code.minPurchase ? Number(code.minPurchase) : null,
        maxDiscount: code.maxDiscount ? Number(code.maxDiscount) : null,
        usagePerUser: code.usagePerUser ?? null,
        applicableCategories: Array.isArray(code.applicableCategories) ? code.applicableCategories : [],
        excludedCategories: Array.isArray(code.excludedCategories) ? code.excludedCategories : [],
        isNewUserOnly: Boolean(code.isNewUserOnly),
    };
}

export function buildPromoInsertValues(input: PromoCodeInput) {
    const now = mysqlNow();

    return {
        id: crypto.randomUUID(),
        code: input.code.toUpperCase(),
        codeType: input.codeType,
        discountType: input.discountType,
        discountValue: String(input.discountValue),
        minPurchase: input.codeType === "DISCOUNT" && input.minOrderAmount > 0 ? String(input.minOrderAmount) : null,
        maxDiscount: input.codeType === "DISCOUNT" && input.maxDiscount > 0 ? String(input.maxDiscount) : null,
        usageLimit: input.maxUses > 0 ? input.maxUses : null,
        usagePerUser: input.usagePerUser > 0 ? input.usagePerUser : null,
        usedCount: 0,
        startsAt: input.startsAt ? toMySQLDatetime(new Date(input.startsAt)) : toMySQLDatetime(new Date()),
        expiresAt: input.expiresAt ? toMySQLDatetime(new Date(input.expiresAt)) : null,
        applicableCategories: normalizeCategoryList(input.applicableCategories),
        excludedCategories: normalizeCategoryList(input.excludedCategories),
        isNewUserOnly: input.isNewUserOnly,
        isActive: input.isActive,
        createdAt: now,
        updatedAt: now,
    };
}

export function buildPromoUpdateValues(input: PromoUpdateInput) {
    const updateData: Record<string, unknown> = {};

    if (input.code !== undefined) updateData.code = input.code.toUpperCase();
    if (input.codeType !== undefined) updateData.codeType = input.codeType;
    if (input.discountType !== undefined) updateData.discountType = input.discountType;
    if (input.discountValue !== undefined) updateData.discountValue = parseOptionalDecimal(input.discountValue);
    if (input.minPurchase !== undefined) updateData.minPurchase = parseOptionalPositiveDecimal(input.minPurchase);
    if (input.maxDiscount !== undefined) updateData.maxDiscount = parseOptionalPositiveDecimal(input.maxDiscount);
    if (input.usageLimit !== undefined) updateData.usageLimit = parseOptionalInt(input.usageLimit);
    if (input.usagePerUser !== undefined) updateData.usagePerUser = parseOptionalInt(input.usagePerUser);
    if (input.startsAt !== undefined) {
        updateData.startsAt = input.startsAt ? toMySQLDatetime(new Date(input.startsAt)) : null;
    }
    if (input.expiresAt !== undefined) {
        updateData.expiresAt = input.expiresAt ? toMySQLDatetime(new Date(input.expiresAt)) : null;
    }
    if (input.applicableCategories !== undefined) {
        updateData.applicableCategories = normalizeCategoryList(input.applicableCategories);
    }
    if (input.excludedCategories !== undefined) {
        updateData.excludedCategories = normalizeCategoryList(input.excludedCategories);
    }
    if (input.isNewUserOnly !== undefined) updateData.isNewUserOnly = input.isNewUserOnly;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    return updateData;
}
