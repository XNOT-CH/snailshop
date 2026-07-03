import { NextRequest, NextResponse } from "next/server";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { invalidateProductCaches } from "@/lib/cache";
import { createProduct } from "@/lib/features/products/mutations";
import { listProductsForStockCheck } from "@/lib/features/products/queries";
import { parseProductPrice, validateCurrency, validateDiscountPrice, validatePointCurrencyPricing, type ProductPayloadInput } from "@/lib/features/products/shared";
import { findProductStockUserConflict, productStockUserConflictResponseMessage } from "@/lib/features/products/stockValidation";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(request: NextRequest) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.PRODUCT_CREATE);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const body = await request.json() as ProductPayloadInput;
        const { title, price, discountPrice, image, images, category, description, secretData, currency, stockSeparator, autoDeleteAfterSale } = body;

        if (!title || !price || !category) {
            return NextResponse.json({ success: false, message: "Missing required fields: title, price, category" }, { status: 400 });
        }

        const currencyError = validateCurrency(currency);
        if (currencyError) {
            return NextResponse.json({ success: false, message: currencyError.error }, { status: 400 });
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

        const pointPricingError = validatePointCurrencyPricing(currency, priceNumber, discountPriceNumber);
        if (pointPricingError) {
            return NextResponse.json({ success: false, message: pointPricingError.error }, { status: 400 });
        }

        const stockConflict = await findProductStockUserConflict(
            secretData || "",
            stockSeparator || "newline",
            listProductsForStockCheck
        );
        if (stockConflict) {
            return NextResponse.json(
                { success: false, message: productStockUserConflictResponseMessage(stockConflict) },
                { status: 409 }
            );
        }

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
