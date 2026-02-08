import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/encryption";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

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
            data: {
                ...product,
                secretData: decrypt(product.secretData || ""),
            },
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
        const { title, price, discountPrice, image, category, description, secretData, currency, stockSeparator } = body;

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

        // Validate discountPrice if provided
        let discountPriceNumber: number | null = null;
        const priceNumber = parseFloat(price);
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

        // Update the product
        const updatedProduct = await db.product.update({
            where: { id },
            data: {
                name: title,
                price: priceNumber,
                discountPrice: discountPriceNumber,
                imageUrl: image || null,
                category,
                currency: currency || "THB",
                description: description || null,
                secretData: encrypt(secretData),
                stockSeparator: stockSeparator || "newline",
            },
        });

        // Build changes array for audit log
        const changes = [];
        if (existingProduct.name !== title) {
            changes.push({ field: "name", old: existingProduct.name, new: title });
        }
        if (existingProduct.price !== priceNumber) {
            changes.push({ field: "price", old: String(existingProduct.price), new: String(priceNumber) });
        }
        if (existingProduct.discountPrice !== discountPriceNumber) {
            changes.push({ field: "discountPrice", old: existingProduct.discountPrice ? String(existingProduct.discountPrice) : "ไม่มี", new: discountPriceNumber ? String(discountPriceNumber) : "ไม่มี" });
        }
        if (existingProduct.category !== category) {
            changes.push({ field: "category", old: existingProduct.category || "ไม่มี", new: category || "ไม่มี" });
        }
        if (existingProduct.description !== description) {
            changes.push({ field: "description", old: existingProduct.description || "ไม่มี", new: description || "ไม่มี" });
        }
        if (existingProduct.imageUrl !== image) {
            changes.push({ field: "imageUrl", old: existingProduct.imageUrl || "ไม่มี", new: image || "ไม่มี" });
        }

        // Audit log with change tracking
        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.PRODUCT_UPDATE,
            resource: "Product",
            resourceId: id,
            resourceName: title,
            details: {
                resourceName: title,
                changes,
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

        // Audit log for deletion
        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.PRODUCT_DELETE,
            resource: "Product",
            resourceId: id,
            resourceName: product.name,
            details: {
                resourceName: product.name,
                deletedData: {
                    name: product.name,
                    price: product.price,
                    category: product.category,
                },
            },
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
