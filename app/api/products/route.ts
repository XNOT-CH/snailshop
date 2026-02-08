import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

export async function POST(request: NextRequest) {
    // Check if user is admin
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json(
            { success: false, message: authCheck.error },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();
        const { title, price, discountPrice, image, category, description, secretData, currency, stockSeparator } = body;

        // Validate required fields
        if (!title || !price || !category) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Missing required fields: title, price, category",
                },
                { status: 400 }
            );
        }

        // Validate price is a number
        const priceNumber = parseFloat(price);
        if (isNaN(priceNumber) || priceNumber <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Price must be a positive number",
                },
                { status: 400 }
            );
        }

        // Validate discountPrice if provided
        let discountPriceNumber: number | null = null;
        if (discountPrice !== undefined && discountPrice !== "" && discountPrice !== null) {
            discountPriceNumber = parseFloat(discountPrice);
            if (isNaN(discountPriceNumber) || discountPriceNumber < 0) {
                return NextResponse.json(
                    { success: false, message: "Discount price must be a positive number" },
                    { status: 400 }
                );
            }
            if (discountPriceNumber >= priceNumber) {
                return NextResponse.json(
                    { success: false, message: "Discount price must be less than original price" },
                    { status: 400 }
                );
            }
        }

        // Create product in database (secretData can be empty for products with stock added later)
        const product = await db.product.create({
            data: {
                name: title,
                price: priceNumber,
                discountPrice: discountPriceNumber,
                imageUrl: image || null,
                category: category,
                currency: currency || "THB",
                description: description || null,
                secretData: secretData ? encrypt(secretData) : "",
                stockSeparator: stockSeparator || "newline",
                isSold: false,
            },
        });

        // Audit log for product creation
        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.PRODUCT_CREATE,
            resource: "Product",
            resourceId: product.id,
            resourceName: title,
            details: {
                resourceName: title,
                price: priceNumber,
                category: category,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Product created successfully",
            product: {
                id: product.id,
                name: product.name,
                price: product.price,
                category: product.category,
            },
        });
    } catch (error) {
        console.error("Create product error:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to create product",
            },
            { status: 500 }
        );
    }
}
