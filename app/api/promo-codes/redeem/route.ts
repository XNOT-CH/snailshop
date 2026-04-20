import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db, promoCodes, promoUsages, users } from "@/lib/db";
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
    try {
        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อนเติมโค้ด" }, { status: 401 });
        }

        const body = await request.json() as { code?: string; pin?: string };
        const code = body.code?.trim().toUpperCase();

        if (!code) {
            return NextResponse.json({ success: false, message: "กรุณากรอกโค้ดก่อนเติมโค้ด" }, { status: 400 });
        }

        const pinCheck = await assertPinForProtectedAction(userId, body.pin);
        if (!pinCheck.success) {
            return NextResponse.json({ success: false, message: pinCheck.message }, { status: pinCheck.status });
        }

        const result = await db.transaction(async (tx) => {
            const promo = await tx.query.promoCodes.findFirst({
                where: eq(promoCodes.code, code),
            });

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

        return NextResponse.json({
            success: true,
            message: `เติมเครดิตสำเร็จ +฿${result.amount.toLocaleString()}`,
            data: result,
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : "ไม่สามารถเติมโค้ดได้",
        }, { status: 400 });
    }
}
