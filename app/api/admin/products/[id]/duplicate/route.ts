import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const { id } = await params;
        const original = await db.product.findUnique({ where: { id } });

        if (!original) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        const duplicate = await db.product.create({
            data: {
                name: `${original.name} (สำเนา)`,
                description: original.description,
                price: original.price,
                discountPrice: null,
                imageUrl: original.imageUrl,
                category: original.category,
                secretData: "",
                isSold: false,
                isFeatured: false,
                sortOrder: 0,
            },
        });

        return NextResponse.json({ success: true, product: duplicate });
    } catch (error) {
        console.error("Error duplicating product:", error);
        return NextResponse.json({ error: "Failed to duplicate product" }, { status: 500 });
    }
}
