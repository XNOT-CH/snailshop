import { NextRequest, NextResponse } from "next/server";
import { and, inArray, isNull } from "drizzle-orm";
import { db, products } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { checkPurchaseRateLimit, getClientIp } from "@/lib/rateLimit";
import { getProductStockCount } from "@/lib/features/products/shared";
import { MAX_CART_QUANTITY } from "@/lib/constants/cart";

export const dynamic = "force-dynamic";

const MSG_SELECT_PRODUCTS = "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ";
const MSG_MAX_PRODUCTS = `ไม่สามารถตรวจสอบสินค้ามากกว่า ${MAX_CART_QUANTITY} รายการในครั้งเดียว`;
const MSG_PRODUCTS_NOT_FOUND = "บางสินค้าไม่พบในระบบ";
const MSG_INVALID_QUANTITY = "จำนวนสินค้าต้องเป็นจำนวนเต็มบวก";
const REFRESH_VALIDATION_MESSAGES = new Set([
    MSG_SELECT_PRODUCTS,
    MSG_PRODUCTS_NOT_FOUND,
    MSG_INVALID_QUANTITY,
]);

interface CartRefreshInputItem {
    productId?: string;
    quantity?: number | null;
}

function normalizeRefreshItems(rawItems: unknown) {
    const aggregated = new Map<string, number>();

    if (!Array.isArray(rawItems)) {
        throw new Error(MSG_SELECT_PRODUCTS);
    }

    for (const item of rawItems) {
        if (!item || typeof item !== "object") {
            throw new Error(MSG_SELECT_PRODUCTS);
        }

        const { productId, quantity } = item as CartRefreshInputItem;
        const requestedQuantity = quantity ?? 1;
        if (typeof productId !== "string") {
            throw new Error(MSG_SELECT_PRODUCTS);
        }

        const trimmedId = productId.trim();
        if (!trimmedId) {
            throw new Error(MSG_PRODUCTS_NOT_FOUND);
        }

        if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
            throw new Error(MSG_INVALID_QUANTITY);
        }

        aggregated.set(trimmedId, (aggregated.get(trimmedId) ?? 0) + requestedQuantity);
    }

    return Array.from(aggregated.entries()).map(([productId, quantity]) => ({ productId, quantity }));
}

function toNumber(value: string | number | null | undefined) {
    if (value == null) {
        return null;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
}

export async function POST(request: NextRequest) {
    // Only a signed-in shopper has a cart to check, and each check reads up to
    // 50 products — decrypting their stock when the count is not stored.
    const authCheck = await isAuthenticated();
    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json(
            { success: false, message: authCheck.error ?? "กรุณาเข้าสู่ระบบก่อน" },
            { status: 401 },
        );
    }

    const rateLimit = await checkPurchaseRateLimit(`${getClientIp(request)}:${authCheck.userId}:cart-refresh`);
    if (rateLimit.blocked) {
        return NextResponse.json(
            { success: false, message: "ตรวจสอบตะกร้าถี่เกินไป กรุณารอสักครู่" },
            { status: 429 },
        );
    }

    try {
        const { items } = await request.json();
        const refreshItems = normalizeRefreshItems(items);

        if (refreshItems.length === 0) {
            return NextResponse.json({ success: false, message: MSG_SELECT_PRODUCTS }, { status: 400 });
        }

        const totalRequestedQuantity = refreshItems.reduce((sum, item) => sum + item.quantity, 0);
        if (totalRequestedQuantity > MAX_CART_QUANTITY) {
            return NextResponse.json({ success: false, message: MSG_MAX_PRODUCTS }, { status: 400 });
        }

        const productIds = refreshItems.map((item) => item.productId);
        const productRows = await db.select({
            id: products.id,
            name: products.name,
            price: products.price,
            discountPrice: products.discountPrice,
            currency: products.currency,
            imageUrl: products.imageUrl,
            category: products.category,
            isSold: products.isSold,
            stockCount: products.stockCount,
            secretData: products.secretData,
            stockSeparator: products.stockSeparator,
        }).from(products).where(and(isNull(products.deletedAt), inArray(products.id, productIds)));

        const productsById = new Map(productRows.map((product) => [product.id, product]));
        const refreshedItems = [];
        const missingProductIds: string[] = [];
        const soldProductIds: string[] = [];
        const quantityAdjustedProductIds: string[] = [];

        for (const refreshItem of refreshItems) {
            const product = productsById.get(refreshItem.productId);
            if (!product) {
                missingProductIds.push(refreshItem.productId);
                continue;
            }

            const stockCount = product.stockCount ?? getProductStockCount(product.secretData, product.stockSeparator);
            if (product.isSold || stockCount <= 0) {
                soldProductIds.push(product.id);
                continue;
            }

            const availableQuantity = Math.min(refreshItem.quantity, stockCount);
            if (availableQuantity < refreshItem.quantity) {
                quantityAdjustedProductIds.push(product.id);
            }

            refreshedItems.push({
                id: product.id,
                name: product.name,
                price: toNumber(product.price) ?? 0,
                discountPrice: toNumber(product.discountPrice),
                currency: product.currency,
                imageUrl: product.imageUrl,
                category: product.category,
                quantity: availableQuantity,
                stock: stockCount,
                requestedQuantity: refreshItem.quantity,
                availableQuantity,
            });
        }

        return NextResponse.json(
            {
                success: true,
                items: refreshedItems,
                missingProductIds,
                soldProductIds,
                quantityAdjustedProductIds,
            },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        console.error("Cart refresh error:", error);
        if (error instanceof Error && REFRESH_VALIDATION_MESSAGES.has(error.message)) {
            return NextResponse.json(
                { success: false, message: error.message },
                { status: 400 },
            );
        }

        return NextResponse.json(
            { success: false, message: "เกิดข้อผิดพลาดในการตรวจสอบตะกร้า" },
            { status: 500 },
        );
    }
}
