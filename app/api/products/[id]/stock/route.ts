import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { updateProductStock } from "@/lib/features/products/mutations";
import { findProductById, listOtherProductsForStockCheck, listOtherProductsForTakenUsers } from "@/lib/features/products/queries";
import { extractStockUsers, extractUsersFromEncryptedStock } from "@/lib/features/products/shared";

interface RouteParams { params: Promise<{ id: string }> }

/**
 * GET /api/products/[id]/stock
 * Returns all usernames already taken by OTHER products (for real-time duplicate check in UI).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });

    try {
        const { id } = await params;
        const otherProducts = await listOtherProductsForTakenUsers(id);

        // Collect all usernames used in other products
        const takenUsers: Record<string, string> = {}; // user -> productName
        for (const other of otherProducts) {
            if (!other.secretData?.trim()) continue;
            try {
                const users = extractUsersFromEncryptedStock(other.secretData, other.stockSeparator);
                for (const user of users) {
                    if (user) takenUsers[user] = other.name;
                }
            } catch { /* skip undecryptable */ }
        }

        return NextResponse.json({ success: true, takenUsers });
    } catch (error) {
        console.error("Get taken users error:", error);
        return NextResponse.json({ success: false, message: "Failed to load" }, { status: 500 });
    }
}

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

        const existingProduct = await findProductById(id);
        if (!existingProduct) return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });

        // ── Cross-product duplicate check ──────────────────────────────
        // Extract the usernames from the new secretData being saved
        const newUsers = extractStockUsers(secretData, "newline");

        if (newUsers.length > 0) {
            // Fetch all OTHER products that still have stock
            const otherProducts = await listOtherProductsForStockCheck(id);

            for (const other of otherProducts) {
                if (!other.secretData?.trim()) continue;
                try {
                    const otherUsers = new Set(extractUsersFromEncryptedStock(other.secretData, other.stockSeparator));
                    const collision = newUsers.find((u) => otherUsers.has(u));
                    if (collision) {
                        return NextResponse.json(
                            {
                                success: false,
                                message: `User "${collision}" มีอยู่ในสต็อกของสินค้า "${other.name}" แล้ว`,
                            },
                            { status: 409 }
                        );
                    }
                } catch {
                    // If decrypt fails for another product, skip it
                }
            }
        }
        // ──────────────────────────────────────────────────────────────

        const hasStock = secretData.trim().length > 0;
        await updateProductStock(id, secretData, hasStock);

        return NextResponse.json({ success: true, message: "Stock updated" });
    } catch (error) {
        console.error("Update stock error:", error);
        return NextResponse.json({ success: false, message: "Failed to update stock" }, { status: 500 });
    }
}

