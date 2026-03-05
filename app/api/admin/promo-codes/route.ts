import { NextRequest, NextResponse } from "next/server";
import { db, promoCodes } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { validateBody } from "@/lib/validations/validate";
import { promoCodeSchema } from "@/lib/validations/promoCode";

export async function GET() {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    try {
        const codes = await db.query.promoCodes.findMany({ orderBy: (t, { desc }) => desc(t.createdAt) });
        return NextResponse.json({
            success: true,
            data: codes.map((code) => ({
                ...code, discountValue: Number(code.discountValue),
                minPurchase: code.minPurchase ? Number(code.minPurchase) : null,
                maxDiscount: code.maxDiscount ? Number(code.maxDiscount) : null,
            })),
        });
    } catch (error) {
        return NextResponse.json({ success: false, message: "Failed to fetch promo codes" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    try {
        const result = await validateBody(request, promoCodeSchema);
        if ("error" in result) return result.error;
        const body = result.data;

        const existing = await db.query.promoCodes.findFirst({ where: eq(promoCodes.code, body.code.toUpperCase()) });
        if (existing) return NextResponse.json({ success: false, message: "Promo code already exists" }, { status: 400 });

        const newId = crypto.randomUUID();
        const toMySQLDatetime = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
        await db.insert(promoCodes).values({
            id: newId,
            code: body.code.toUpperCase(),
            discountType: body.discountType,
            discountValue: String(body.discountValue),
            minPurchase: body.minOrderAmount > 0 ? String(body.minOrderAmount) : null,
            usageLimit: body.maxUses > 0 ? body.maxUses : null,
            expiresAt: body.expiresAt ? toMySQLDatetime(new Date(body.expiresAt)) : null,
            startsAt: toMySQLDatetime(new Date()),
            isActive: body.isActive,
        });
        const promoCode = await db.query.promoCodes.findFirst({ where: eq(promoCodes.id, newId) });
        return NextResponse.json({ success: true, message: "Promo code created successfully", data: promoCode });
    } catch (error) {
        console.error("Create promo code error:", error);
        return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Failed to create promo code" }, { status: 500 });
    }
}
