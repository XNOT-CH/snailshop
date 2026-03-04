import { NextRequest, NextResponse } from "next/server";
import { db, products } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/encryption";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });

    try {
        const { id } = await params;
        const product = await db.query.products.findFirst({ where: eq(products.id, id) });
        if (!product) return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });

        return NextResponse.json({ success: true, data: { ...product, secretData: decrypt(product.secretData || "") } });
    } catch (error) {
        return NextResponse.json({ success: false, message: "Failed to fetch product" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });

    try {
        const { id } = await params;
        const body = await request.json();
        const { title, price, discountPrice, image, category, description, secretData, currency, stockSeparator } = body;

        const existingProduct = await db.query.products.findFirst({ where: eq(products.id, id) });
        if (!existingProduct) return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });

        let discountPriceNumber: number | null = null;
        const priceNumber = parseFloat(price);
        if (discountPrice !== undefined && discountPrice !== "" && discountPrice !== null) {
            discountPriceNumber = parseFloat(discountPrice);
            if (isNaN(discountPriceNumber) || discountPriceNumber < 0) {
                return NextResponse.json({ success: false, message: "Discount price must be a positive number" }, { status: 400 });
            }
            if (discountPriceNumber >= priceNumber) {
                return NextResponse.json({ success: false, message: "Discount price must be less than original price" }, { status: 400 });
            }
        }

        await db.update(products).set({
            name: title,
            price: String(priceNumber),
            discountPrice: discountPriceNumber !== null ? String(discountPriceNumber) : null,
            imageUrl: image || null,
            category,
            currency: currency || "THB",
            description: description || null,
            secretData: encrypt(secretData),
            stockSeparator: stockSeparator || "newline",
        }).where(eq(products.id, id));

        const changes = [];
        if (existingProduct.name !== title) changes.push({ field: "name", old: existingProduct.name, new: title });
        if (Number(existingProduct.price) !== priceNumber) changes.push({ field: "price", old: String(existingProduct.price), new: String(priceNumber) });
        if (existingProduct.category !== category) changes.push({ field: "category", old: existingProduct.category, new: category });

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.PRODUCT_UPDATE, resource: "Product", resourceId: id, resourceName: title,
            details: { resourceName: title, changes },
        });

        return NextResponse.json({ success: true, message: "Product updated successfully", data: { id, ...body } });
    } catch (error) {
        return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Failed to update product" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });

    try {
        const { id } = await params;
        const product = await db.query.products.findFirst({ where: eq(products.id, id) });
        if (!product) return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });

        if (product.orderId) {
            await db.update(products).set({ orderId: null }).where(eq(products.id, id));
        }
        await db.delete(products).where(eq(products.id, id));

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.PRODUCT_DELETE, resource: "Product", resourceId: id, resourceName: product.name,
            details: { resourceName: product.name, deletedData: { name: product.name, price: product.price, category: product.category } },
        });

        return NextResponse.json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
        console.error("Delete product error:", error);
        return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Failed to delete product" }, { status: 500 });
    }
}
