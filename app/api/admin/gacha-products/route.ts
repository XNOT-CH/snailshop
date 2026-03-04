import { NextResponse } from "next/server";
import { db, products } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";
import { getStockCount } from "@/lib/stock";

export async function GET() {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    try {
        const productList = await db.query.products.findMany({
            where: eq(products.isSold, false),
            orderBy: (t, { desc }) => desc(t.createdAt),
            columns: { id: true, name: true, price: true, imageUrl: true, category: true, secretData: true, stockSeparator: true },
        });
        return NextResponse.json({
            success: true,
            data: productList.map((p) => {
                let stockCount = 0;
                try { stockCount = getStockCount(decrypt(p.secretData || ""), p.stockSeparator || "newline"); } catch { stockCount = 0; }
                return { id: p.id, name: p.name, price: Number(p.price), imageUrl: p.imageUrl, category: p.category, stockCount };
            }),
        });
    } catch (error) {
        return NextResponse.json({ success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : "Unknown"}` }, { status: 500 });
    }
}
