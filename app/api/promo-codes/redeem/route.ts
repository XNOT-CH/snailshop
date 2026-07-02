import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { db, promoCodes, promoUsages, users } from "@/lib/db";
import {
    checkPromoValidationRateLimit,
    clearPromoValidationAttempts,
    getClientIp,
    recordFailedPromoValidation,
} from "@/lib/rateLimit";
import { assertPinForProtectedAction } from "@/lib/security/pin";

function getCreditCodeValidationMessage(promo: {
    codeType?: string | null;
    isActive: boolean;
    startsAt: string | Date;
    expiresAt: string | Date | null;
    usageLimit: number | null;
    usedCount: number;
}) {
    if ((promo.codeType ?? "DISCOUNT") !== "CREDIT") {
        return "โค้ดนี้ไม่ใช่โค้ดเติมเครดิต";
    }

    if (!promo.isActive) {
        return "โค้ดนี้ถูกปิดใช้งานแล้ว";
    }

    const now = new Date();

    if (now < new Date(promo.startsAt)) {
        return "โค้ดนี้ยังไม่ถึงวันเริ่มใช้งาน";
    }

    if (promo.expiresAt && now > new Date(promo.expiresAt)) {
        return "โค้ดนี้หมดอายุแล้ว";
    }

    if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
        return "โค้ดนี้ถูกใช้ครบจำนวนแล้ว";
    }

    return null;
}

export async function POST(request: NextRequest) {
    let rateLimitIdentifier: string | null = null;

    try {
        const authCheck = await isAuthenticatedWithCsrf(request);
        const userId = authCheck.userId;

        if (!authCheck.success || !userId) {
            return NextResponse.json({
                success: false,
                message: authCheck.error ?? "กรุณาเข้าสู่ระบบก่อนเติมโค้ด",
            }, { status: 401 });
        }

        const body = await request.json() as { code?: string; pin?: string };
        const code = body.code?.trim().toUpperCase();

        if (!code) {
            return NextResponse.json({ success: false, message: "กรุณากรอกโค้ดก่อนเติมโค้ด" }, { status: 400 });
        }

        const promoRateLimitIdentifier = `${getClientIp(request)}:${userId}`;
        rateLimitIdentifier = promoRateLimitIdentifier;
        const rateLimit = checkPromoValidationRateLimit(promoRateLimitIdentifier);
        if (rateLimit.blocked) {
            return NextResponse.json({
                success: false,
                message: rateLimit.message ?? "กรอกโค้ดผิดบ่อยเกินไป กรุณาลองใหม่ภายหลัง",
            }, { status: 429 });
        }

        const pinCheck = await assertPinForProtectedAction(userId, body.pin);
        if (!pinCheck.success) {
            recordFailedPromoValidation(promoRateLimitIdentifier);
            return NextResponse.json({ success: false, message: pinCheck.message }, { status: pinCheck.status });
        }

        const result = await db.transaction(async (tx) => {
            // Lock the promo row FOR UPDATE so concurrent redeems of the same code
            // are serialized. Without it, parallel requests all read the same
            // usedCount / per-user usage snapshot and each grant credit, bypassing
            // usageLimit and usagePerUser to mint unlimited free credit.
            const lockedPromos = await tx
                .select()
                .from(promoCodes)
                .where(eq(promoCodes.code, code))
                .for("update");
            const promo = lockedPromos[0];

            if (!promo) {
                throw new Error("ไม่พบโค้ดนี้ในระบบ");
            }

            const validationMessage = getCreditCodeValidationMessage(promo);
            if (validationMessage) {
                throw new Error(validationMessage);
            }

            const usageRows = await tx
                .select({ count: sql<number>`count(*)` })
                .from(promoUsages)
                .where(
                    and(
                        eq(promoUsages.promoCodeId, promo.id),
                        eq(promoUsages.userId, userId),
                        ne(promoUsages.status, "REVERTED")
                    )
                );

            const usageCount = Number(usageRows[0]?.count ?? 0);
            // usagePerUser is NULL for every code created via the admin UI (it always
            // sends 0, which is stored as NULL). For CREDIT codes NULL deliberately
            // defaults to 1 redeem per user — treating it as unlimited would let a
            // single user drain the code's entire usageLimit as free credit. This is
            // intentionally stricter than the DISCOUNT purchase path, where NULL
            // means no per-user limit.
            const usagePerUserLimit = promo.usagePerUser ?? 1;

            if (usageCount >= usagePerUserLimit) {
                throw new Error("บัญชีนี้ใช้โค้ดนี้ครบสิทธิ์แล้ว");
            }

            const creditAmount = Number(promo.discountValue);
            if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
                throw new Error("จำนวนเครดิตของโค้ดนี้ไม่ถูกต้อง");
            }

            await tx
                .update(users)
                .set({ creditBalance: sql`creditBalance + ${creditAmount}` })
                .where(eq(users.id, userId));

            await tx
                .update(promoCodes)
                .set({ usedCount: sql`usedCount + 1` })
                .where(eq(promoCodes.id, promo.id));

            await tx.insert(promoUsages).values({
                id: crypto.randomUUID(),
                promoCodeId: promo.id,
                userId,
                orderId: null,
                promoCode: promo.code,
                discountAmount: creditAmount.toFixed(2),
                status: "COMPLETED",
            });

            const updatedUser = await tx.query.users.findFirst({
                where: eq(users.id, userId),
                columns: { creditBalance: true },
            });

            return {
                code: promo.code,
                amount: creditAmount,
                balance: Number(updatedUser?.creditBalance ?? 0),
            };
        });

        clearPromoValidationAttempts(promoRateLimitIdentifier);

        return NextResponse.json({
            success: true,
            message: `เติมเครดิตสำเร็จ +฿${result.amount.toLocaleString()}`,
            data: result,
        });
    } catch (error) {
        if (rateLimitIdentifier) {
            recordFailedPromoValidation(rateLimitIdentifier);
        }

        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : "ไม่สามารถเติมโค้ดได้",
        }, { status: 400 });
    }
}
