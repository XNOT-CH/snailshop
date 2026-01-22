import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";

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
        const { title, price, image, category, description, secretData } = body;

        // Validate required fields
        if (!title || !price || !category || !secretData) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Missing required fields: title, price, category, secretData",
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

        // Create product in database
        const product = await db.product.create({
            data: {
                name: title,
                price: priceNumber,
                imageUrl: image || null,
                category: category,
                description: description || null,
                secretData: encrypt(secretData),
                isSold: false,
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
