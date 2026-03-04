import { NextRequest, NextResponse } from "next/server";
import { db, promoCodes } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";

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
        const body = await request.json();
        const { code, discountType, discountValue, minPurchase, maxDiscount, usageLimit, startsAt, expiresAt, isActive } = body;
        if (!code || !discountValue) return NextResponse.json({ success: false, message: "Code and discount value are required" }, { status: 400 });

        const existing = await db.query.promoCodes.findFirst({ where: eq(promoCodes.code, code.toUpperCase()) });
        if (existing) return NextResponse.json({ success: false, message: "Promo code already exists" }, { status: 400 });

        const newId = crypto.randomUUID();
        const toMySQLDatetime = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
        await db.insert(promoCodes).values({
            id: newId, code: code.toUpperCase(), discountType: discountType || "PERCENTAGE",
            discountValue: String(parseFloat(discountValue)),
            minPurchase: minPurchase ? String(parseFloat(minPurchase)) : null,
            maxDiscount: maxDiscount ? String(parseFloat(maxDiscount)) : null,
            usageLimit: usageLimit ? parseInt(usageLimit) : null,
            startsAt: toMySQLDatetime(startsAt ? new Date(startsAt) : new Date()),
            expiresAt: expiresAt ? toMySQLDatetime(new Date(expiresAt)) : null,
            isActive: isActive !== undefined ? isActive : true,
        });
        const promoCode = await db.query.promoCodes.findFirst({ where: eq(promoCodes.id, newId) });
        return NextResponse.json({ success: true, message: "Promo code created successfully", data: promoCode });
    } catch (error) {
        console.error("Create promo code error:", error);
        return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Failed to create promo code" }, { status: 500 });
    }
}
