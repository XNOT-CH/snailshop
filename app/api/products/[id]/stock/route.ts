import { NextRequest, NextResponse } from "next/server";
import { db, products } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";

interface RouteParams { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });

    try {
        const { id } = await params;
        const body = await request.json();
        const { secretData } = body;

        if (secretData === undefined) {
            return NextResponse.json({ success: false, message: "Missing secretData" }, { status: 400 });
        }

        const existingProduct = await db.query.products.findFirst({ where: eq(products.id, id) });
        if (!existingProduct) return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });

        const hasStock = secretData.trim().length > 0;
        await db.update(products).set({ secretData: encrypt(secretData), isSold: !hasStock }).where(eq(products.id, id));

        return NextResponse.json({ success: true, message: "Stock updated" });
    } catch (error) {
        console.error("Update stock error:", error);
        return NextResponse.json({ success: false, message: "Failed to update stock" }, { status: 500 });
    }
}
