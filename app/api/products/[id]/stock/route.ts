import { NextRequest, NextResponse } from "next/server";
import { db, products } from "@/lib/db";
import { eq, ne } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/encryption";
import { splitStock } from "@/lib/stock";

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
        const otherProducts = await db.query.products.findMany({
            where: ne(products.id, id),
            columns: { name: true, secretData: true, stockSeparator: true },
        });

        // Collect all usernames used in other products
        const takenUsers: Record<string, string> = {}; // user -> productName
        for (const other of otherProducts) {
            if (!other.secretData?.trim()) continue;
            try {
                const decrypted = decrypt(other.secretData);
                const items = splitStock(decrypted, other.stockSeparator ?? "newline");
                for (const item of items) {
                    const user = item.split(" / ")[0]?.trim();
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

        const existingProduct = await db.query.products.findFirst({ where: eq(products.id, id) });
        if (!existingProduct) return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });

        // ── Cross-product duplicate check ──────────────────────────────
        // Extract the usernames from the new secretData being saved
        const newItems = splitStock(secretData, "newline");
        const newUsers = newItems
            .map((item) => item.split(" / ")[0]?.trim())
            .filter(Boolean) as string[];

        if (newUsers.length > 0) {
            // Fetch all OTHER products that still have stock
            const otherProducts = await db.query.products.findMany({
                where: ne(products.id, id),
                columns: { id: true, name: true, secretData: true, stockSeparator: true },
            });

            for (const other of otherProducts) {
                if (!other.secretData?.trim()) continue;
                try {
                    const decrypted = decrypt(other.secretData);
                    const otherItems = splitStock(decrypted, other.stockSeparator ?? "newline");
                    const otherUsers = new Set(
                        otherItems.map((item) => item.split(" / ")[0]?.trim()).filter(Boolean)
                    );
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
        await db.update(products).set({ secretData: encrypt(secretData), isSold: !hasStock }).where(eq(products.id, id));

        return NextResponse.json({ success: true, message: "Stock updated" });
    } catch (error) {
        console.error("Update stock error:", error);
        return NextResponse.json({ success: false, message: "Failed to update stock" }, { status: 500 });
    }
}

