import { eq } from "drizzle-orm";
import { db, seasonPassSubscriptions } from "@/lib/db";
import { getOrCreateSeasonPassPlan } from "@/lib/seasonPass";
import { mysqlDateTimeToIso, toMySQLDatetime } from "@/lib/utils/date";

type SubscriptionRow = {
    id: string;
    userId: string;
    endAt: string;
    status: string;
    pricePaid: string | null;
};

export const MAX_EXTENSION_DAYS = 90;

async function findSubscription(subscriptionId: string) {
    const rows = await db
        .select({
            id: seasonPassSubscriptions.id,
            userId: seasonPassSubscriptions.userId,
            endAt: seasonPassSubscriptions.endAt,
            status: seasonPassSubscriptions.status,
            pricePaid: seasonPassSubscriptions.pricePaid,
        })
        .from(seasonPassSubscriptions)
        .where(eq(seasonPassSubscriptions.id, subscriptionId))
        .limit(1);

    return (rows[0] as SubscriptionRow | undefined) ?? null;
}

/**
 * Pushes a subscription's end date out. For the everyday case behind it — the
 * customer who paid and then could not claim because something on our side was
 * down — the admin had no tool at all and the only option was editing the
 * database by hand.
 */
export async function extendSeasonPassSubscription(subscriptionId: string, days: number) {
    if (!Number.isInteger(days) || days < 1 || days > MAX_EXTENSION_DAYS) {
        return { ok: false as const, status: 400, message: `จำนวนวันต้องเป็น 1–${MAX_EXTENSION_DAYS} วัน` };
    }

    const subscription = await findSubscription(subscriptionId);
    if (!subscription) {
        return { ok: false as const, status: 404, message: "ไม่พบรายการสมาชิกนี้" };
    }

    // Extending something that already ended would leave a gap in the middle, so
    // start counting from today instead of from the old end date.
    const stillRunning = subscription.endAt > toMySQLDatetime(new Date());
    const base = stillRunning ? new Date(mysqlDateTimeToIso(subscription.endAt) ?? Date.now()) : new Date();
    const nextEnd = new Date(base);
    nextEnd.setDate(nextEnd.getDate() + days);
    const nextEndAt = toMySQLDatetime(nextEnd);

    await db
        .update(seasonPassSubscriptions)
        .set({ endAt: nextEndAt, status: "ACTIVE" })
        .where(eq(seasonPassSubscriptions.id, subscriptionId));

    return {
        ok: true as const,
        status: 200,
        subscription,
        previousEndAt: subscription.endAt,
        endAt: nextEndAt,
        days,
    };
}

/**
 * Ends a subscription now, optionally putting the credits back. The refund is
 * what the sale actually charged (pricePaid), falling back to the plan price for
 * rows sold before that column existed.
 */
export async function cancelSeasonPassSubscription(subscriptionId: string, options: { refund: boolean }) {
    const subscription = await findSubscription(subscriptionId);
    if (!subscription) {
        return { ok: false as const, status: 404, message: "ไม่พบรายการสมาชิกนี้" };
    }

    if (subscription.status === "EXPIRED" && subscription.endAt < toMySQLDatetime(new Date())) {
        return { ok: false as const, status: 400, message: "รายการนี้สิ้นสุดไปแล้ว" };
    }

    const plan = await getOrCreateSeasonPassPlan();
    const refundAmount = options.refund
        ? Number(subscription.pricePaid ?? plan.price)
        : 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = await (db as any).$client.getConnection();

    try {
        await conn.beginTransaction();

        await conn.execute(
            "UPDATE SeasonPassSubscription SET status = 'EXPIRED', endAt = UTC_TIMESTAMP(), updatedAt = UTC_TIMESTAMP() WHERE id = ?",
            [subscriptionId],
        );

        if (refundAmount > 0) {
            await conn.execute(
                "UPDATE User SET creditBalance = creditBalance + ? WHERE id = ?",
                [refundAmount, subscription.userId],
            );
        }

        await conn.commit();
    } catch (error) {
        await conn.rollback();
        return {
            ok: false as const,
            status: 500,
            message: error instanceof Error ? error.message : "ยกเลิกไม่สำเร็จ",
        };
    } finally {
        conn.release();
    }

    return { ok: true as const, status: 200, subscription, refundAmount };
}
