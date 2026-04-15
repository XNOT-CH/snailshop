import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { invalidateProductCaches } from "@/lib/cache";
import { createProduct } from "@/lib/features/products/mutations";
import { parseProductPrice, validateDiscountPrice, type ProductPayloadInput } from "@/lib/features/products/shared";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.PRODUCT_CREATE);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const body = await request.json() as ProductPayloadInput;
        const { title, price, discountPrice, image, images, category, description, secretData, currency, stockSeparator, autoDeleteAfterSale } = body;

        if (!title || !price || !category) {
            return NextResponse.json({ success: false, message: "Missing required fields: title, price, category" }, { status: 400 });
        }

        const parsedPrice = parseProductPrice(price);
        if ("error" in parsedPrice) {
            return NextResponse.json({ success: false, message: parsedPrice.error }, { status: 400 });
        }
        const priceNumber = parsedPrice.value;

        const discountValidation = validateDiscountPrice(discountPrice, priceNumber);
        if ("error" in discountValidation) {
            return NextResponse.json({ success: false, message: discountValidation.error }, { status: 400 });
        }
        const discountPriceNumber = discountValidation.value;

        const createdProduct = await createProduct({
            title,
            price,
            discountPrice,
            image,
            images,
            category,
            description,
            secretData,
            currency,
            stockSeparator,
            autoDeleteAfterSale,
        }, priceNumber, discountPriceNumber);

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.PRODUCT_CREATE,
            resource: "Product",
            resourceId: createdProduct.id,
            resourceName: title,
            details: { resourceName: title, price: priceNumber, category },
        });

        await invalidateProductCaches();

        return NextResponse.json({
            success: true,
            message: "Product created successfully",
            product: { id: createdProduct.id, name: title, price: priceNumber, category },
        });
    } catch (error) {
        console.error("Create product error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed to create product" },
            { status: 500 }
        );
    }
}
