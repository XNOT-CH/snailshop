import { eq } from "drizzle-orm";
import { db, promoCodes } from "@/lib/db";
import type { PromoCodeInput } from "@/lib/validations/promoCode";
import { buildPromoInsertValues, buildPromoUpdateValues, type PromoUpdateInput } from "./shared";

export async function createPromoCode(input: PromoCodeInput) {
    const insertValues = buildPromoInsertValues(input);
    await db.insert(promoCodes).values(insertValues);
    return insertValues;
}

export async function updatePromoCode(id: string, input: PromoUpdateInput) {
    const updateValues = buildPromoUpdateValues(input);
    await db.update(promoCodes).set(updateValues).where(eq(promoCodes.id, id));
    return db.query.promoCodes.findFirst({
        where: eq(promoCodes.id, id),
    });
}

export function deletePromoCode(id: string) {
    return db.delete(promoCodes).where(eq(promoCodes.id, id));
}
