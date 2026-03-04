import { NextRequest, NextResponse } from "next/server";
import { db, products } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

export async function POST(request: NextRequest) {
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { title, price, discountPrice, image, category, description, secretData, currency, stockSeparator } = body;

        if (!title || !price || !category) {
            return NextResponse.json({ success: false, message: "Missing required fields: title, price, category" }, { status: 400 });
        }

        const priceNumber = parseFloat(price);
        if (isNaN(priceNumber) || priceNumber <= 0) {
            return NextResponse.json({ success: false, message: "Price must be a positive number" }, { status: 400 });
        }

        let discountPriceNumber: number | null = null;
        if (discountPrice !== undefined && discountPrice !== "" && discountPrice !== null) {
            discountPriceNumber = parseFloat(discountPrice);
            if (isNaN(discountPriceNumber) || discountPriceNumber < 0) {
                return NextResponse.json({ success: false, message: "Discount price must be a positive number" }, { status: 400 });
            }
            if (discountPriceNumber >= priceNumber) {
                return NextResponse.json({ success: false, message: "Discount price must be less than original price" }, { status: 400 });
            }
        }

        const newId = crypto.randomUUID();
        await db.insert(products).values({
            id: newId,
            name: title,
            price: String(priceNumber),
            discountPrice: discountPriceNumber !== null ? String(discountPriceNumber) : null,
            imageUrl: image || null,
            category,
            currency: currency || "THB",
            description: description || null,
            secretData: secretData ? encrypt(secretData) : "",
            stockSeparator: stockSeparator || "newline",
            isSold: false,
        });

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.PRODUCT_CREATE,
            resource: "Product",
            resourceId: newId,
            resourceName: title,
            details: { resourceName: title, price: priceNumber, category },
        });

        return NextResponse.json({
            success: true,
            message: "Product created successfully",
            product: { id: newId, name: title, price: priceNumber, category },
        });
    } catch (error) {
        console.error("Create product error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed to create product" },
            { status: 500 }
        );
    }
}
