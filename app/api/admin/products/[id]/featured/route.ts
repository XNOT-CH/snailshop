import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function PATCH(
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
        const body = await request.json();
        const { isFeatured } = body;

        if (typeof isFeatured !== "boolean") {
            return NextResponse.json({ error: "isFeatured must be a boolean" }, { status: 400 });
        }

        const product = await db.product.update({
            where: { id },
            data: { isFeatured },
            select: { id: true, name: true, isFeatured: true },
        });

        return NextResponse.json(product);
    } catch (error) {
        console.error("Error updating featured status:", error);
        return NextResponse.json({ error: "Failed to update featured status" }, { status: 500 });
    }
}
