import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET - Fetch single product (for admin edit page)
export async function GET(request: NextRequest, { params }: RouteParams) {
    // Check if user is admin for viewing product details
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json(
            { success: false, message: authCheck.error },
            { status: 401 }
        );
    }

    try {
        const { id } = await params;

        const product = await db.product.findUnique({
            where: { id },
        });

        if (!product) {
            return NextResponse.json(
                { success: false, message: "Product not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: product,
        });
    } catch (error) {
        console.error("Get product error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch product" },
            { status: 500 }
        );
    }
}

// PUT - Update product (ADMIN ONLY)
export async function PUT(request: NextRequest, { params }: RouteParams) {
    // Check if user is admin
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json(
            { success: false, message: authCheck.error },
            { status: 401 }
        );
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const { title, price, image, category, description, secretData } = body;

        // Check if product exists
        const existingProduct = await db.product.findUnique({
            where: { id },
        });

        if (!existingProduct) {
            return NextResponse.json(
                { success: false, message: "Product not found" },
                { status: 404 }
            );
        }

        // Update the product
        const updatedProduct = await db.product.update({
            where: { id },
            data: {
                name: title,
                price: parseFloat(price),
                imageUrl: image || null,
                category,
                description: description || null,
                secretData: encrypt(secretData),
            },
        });

        return NextResponse.json({
            success: true,
            message: "Product updated successfully",
            data: updatedProduct,
        });
    } catch (error) {
        console.error("Update product error:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to update product",
            },
            { status: 500 }
        );
    }
}

// DELETE - Delete product (ADMIN ONLY)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    // Check if user is admin
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json(
            { success: false, message: authCheck.error },
            { status: 401 }
        );
    }

    try {
        const { id } = await params;

        // Check if product exists
        const product = await db.product.findUnique({
            where: { id },
        });

        if (!product) {
            return NextResponse.json(
                { success: false, message: "Product not found" },
                { status: 404 }
            );
        }

        // If product is linked to an order, unlink it first (keep order history)
        if (product.orderId) {
            await db.product.update({
                where: { id },
                data: { orderId: null },
            });
        }

        // Delete the product
        await db.product.delete({
            where: { id },
        });

        return NextResponse.json({
            success: true,
            message: "Product deleted successfully",
        });
    } catch (error) {
        console.error("Delete product error:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to delete product",
            },
            { status: 500 }
        );
    }
}
