import { NextRequest, NextResponse } from "next/server";
import { db, promoCodes } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";

interface RouteParams { params: Promise<{ id: string }> }

const toMySQLDatetime = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");

export async function GET(request: NextRequest, { params }: RouteParams) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    try {
        const { id } = await params;
        const promoCode = await db.query.promoCodes.findFirst({ where: eq(promoCodes.id, id) });
        if (!promoCode) return NextResponse.json({ success: false, message: "Promo code not found" }, { status: 404 });
        return NextResponse.json({ success: true, data: { ...promoCode, discountValue: Number(promoCode.discountValue), minPurchase: promoCode.minPurchase ? Number(promoCode.minPurchase) : null, maxDiscount: promoCode.maxDiscount ? Number(promoCode.maxDiscount) : null } });
    } catch {
        return NextResponse.json({ success: false, message: "Failed to fetch promo code" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    try {
        const { id } = await params;
        const body = await request.json();
        const { code, discountType, discountValue, minPurchase, maxDiscount, usageLimit, startsAt, expiresAt, isActive } = body;

        const existing = await db.query.promoCodes.findFirst({ where: eq(promoCodes.id, id) });
        if (!existing) return NextResponse.json({ success: false, message: "Promo code not found" }, { status: 404 });

        if (code && code.toUpperCase() !== existing.code) {
            const conflict = await db.query.promoCodes.findFirst({ where: eq(promoCodes.code, code.toUpperCase()) });
            if (conflict) return NextResponse.json({ success: false, message: "Promo code already exists" }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {};
        if (code !== undefined) updateData.code = code.toUpperCase();
        if (discountType !== undefined) updateData.discountType = discountType;
        if (discountValue !== undefined) updateData.discountValue = String(parseFloat(discountValue));
        if (minPurchase !== undefined) updateData.minPurchase = minPurchase ? String(parseFloat(minPurchase)) : null;
        if (maxDiscount !== undefined) updateData.maxDiscount = maxDiscount ? String(parseFloat(maxDiscount)) : null;
        if (usageLimit !== undefined) updateData.usageLimit = usageLimit ? parseInt(usageLimit) : null;
        if (startsAt !== undefined) updateData.startsAt = toMySQLDatetime(new Date(startsAt));
        if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? toMySQLDatetime(new Date(expiresAt)) : null;
        if (isActive !== undefined) updateData.isActive = isActive;

        await db.update(promoCodes).set(updateData as any).where(eq(promoCodes.id, id));
        const updated = await db.query.promoCodes.findFirst({ where: eq(promoCodes.id, id) });
        return NextResponse.json({ success: true, message: "Promo code updated successfully", data: updated });
    } catch (error) {
        return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Failed to update promo code" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    try {
        const { id } = await params;
        const existing = await db.query.promoCodes.findFirst({ where: eq(promoCodes.id, id) });
        if (!existing) return NextResponse.json({ success: false, message: "Promo code not found" }, { status: 404 });
        await db.delete(promoCodes).where(eq(promoCodes.id, id));
        return NextResponse.json({ success: true, message: "Promo code deleted successfully" });
    } catch (error) {
        return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Failed to delete promo code" }, { status: 500 });
    }
}
