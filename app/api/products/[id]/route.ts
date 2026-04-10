import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { invalidateProductCaches } from "@/lib/cache";
import { clearProductOrder, deleteProduct, updateProduct } from "@/lib/features/products/mutations";
import { findProductById } from "@/lib/features/products/queries";
import { decryptProductSecret, parseProductPrice, validateDiscountPrice, type ProductPayloadInput } from "@/lib/features/products/shared";
import { PERMISSIONS } from "@/lib/permissions";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermission(PERMISSIONS.PRODUCT_VIEW);
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });

    try {
        const { id } = await params;
        const product = await findProductById(id);
        if (!product) return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });

        return NextResponse.json({ success: true, data: { ...product, secretData: decryptProductSecret(product.secretData) } });
    } catch (error) {
        console.error("[PRODUCT_GET]", error);
        return NextResponse.json({ success: false, message: "Failed to fetch product" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermission(PERMISSIONS.PRODUCT_EDIT);
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });

    try {
        const { id } = await params;
        const body = await request.json() as ProductPayloadInput;
        const { title, price, discountPrice, image, category, description, secretData, currency, stockSeparator, autoDeleteAfterSale } = body;

        const existingProduct = await findProductById(id);
        if (!existingProduct) return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });

        const parsedPrice = parseProductPrice(price ?? "");
        if ("error" in parsedPrice) return NextResponse.json({ success: false, message: parsedPrice.error }, { status: 400 });
        const priceNumber = parsedPrice.value;

        const discountValidation = validateDiscountPrice(discountPrice, priceNumber);
        if ("error" in discountValidation) return NextResponse.json({ success: false, message: discountValidation.error }, { status: 400 });
        const discountPriceNumber = discountValidation.value;

        await updateProduct(id, {
            title,
            price,
            discountPrice,
            image,
            category,
            description,
            secretData,
            currency,
            stockSeparator,
            autoDeleteAfterSale,
        }, priceNumber, discountPriceNumber);

        const changes = [];
        if (existingProduct.name !== title) changes.push({ field: "name", old: existingProduct.name, new: title });
        if (Number(existingProduct.price) !== priceNumber) changes.push({ field: "price", old: String(existingProduct.price), new: String(priceNumber) });
        if (existingProduct.category !== category) changes.push({ field: "category", old: existingProduct.category, new: category });

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.PRODUCT_UPDATE, resource: "Product", resourceId: id, resourceName: title,
            details: { resourceName: title, changes },
        });

        await invalidateProductCaches();

        return NextResponse.json({ success: true, message: "Product updated successfully", data: { id, ...body } });
    } catch (error) {
        console.error("[PRODUCT_PUT]", error);
        return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Failed to update product" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermission(PERMISSIONS.PRODUCT_DELETE);
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });

    try {
        const { id } = await params;
        const product = await findProductById(id);
        if (!product) return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });

        if (product.orderId) {
            await clearProductOrder(id);
        }
        await deleteProduct(id);

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.PRODUCT_DELETE, resource: "Product", resourceId: id, resourceName: product.name,
            details: { resourceName: product.name, deletedData: { name: product.name, price: product.price, category: product.category } },
        });

        await invalidateProductCaches();

        return NextResponse.json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
        console.error("Delete product error:", error);
        return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Failed to delete product" }, { status: 500 });
    }
}
