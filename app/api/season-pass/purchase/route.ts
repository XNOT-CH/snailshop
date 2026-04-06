import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, users } from "@/lib/db";
import {
    getCurrentSeasonPassSubscription,
    getOrCreateSeasonPassPlan,
    getSeasonPassExtensionEndAt,
    getSeasonPassInitialEndAt,
} from "@/lib/seasonPass";

type LockedUserRow = {
    id: string;
    creditBalance: string;
};

type LockedSubscriptionRow = {
    id: string;
    endAt: string;
};

function formatThaiDate(value: string) {
    return new Date(value.replace(" ", "T") + "Z").toLocaleDateString("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export async function POST() {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const plan = await getOrCreateSeasonPassPlan();
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { id: true, creditBalance: true },
    });

    if (!user) {
        return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    }

    const price = Number(plan.price);
    const balance = Number(user.creditBalance);

    if (balance < price) {
        return NextResponse.json(
            { success: false, message: "เครดิตคงเหลือไม่พอสำหรับซื้อ Season Pass" },
            { status: 400 },
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = await (db as any).$client.getConnection();

    try {
        await conn.beginTransaction();

        const [userRows] = await conn.execute(
            "SELECT id, creditBalance FROM User WHERE id = ? FOR UPDATE",
            [userId],
        );
        const lockedUser = (userRows as LockedUserRow[])[0];

        if (!lockedUser) {
            throw new Error("ไม่พบผู้ใช้งาน");
        }

        if (Number(lockedUser.creditBalance) < price) {
            throw new Error("เครดิตคงเหลือไม่พอสำหรับซื้อ Season Pass");
        }

        await conn.execute(
            "UPDATE SeasonPassSubscription SET status = 'EXPIRED', updatedAt = UTC_TIMESTAMP() WHERE userId = ? AND status = 'ACTIVE' AND endAt < UTC_TIMESTAMP()",
            [userId],
        );

        const [subscriptionRows] = await conn.execute(
            "SELECT id, endAt FROM SeasonPassSubscription WHERE userId = ? AND status = 'ACTIVE' AND endAt >= UTC_TIMESTAMP() ORDER BY endAt DESC LIMIT 1 FOR UPDATE",
            [userId],
        );
        const activeSubscription = (subscriptionRows as LockedSubscriptionRow[])[0];

        const nextEndAt = activeSubscription
            ? getSeasonPassExtensionEndAt(activeSubscription.endAt, plan.durationDays)
            : getSeasonPassInitialEndAt(plan.durationDays);

        await conn.execute(
            "UPDATE User SET creditBalance = creditBalance - ? WHERE id = ?",
            [price, userId],
        );

        if (activeSubscription) {
            await conn.execute(
                "UPDATE SeasonPassSubscription SET endAt = ?, updatedAt = UTC_TIMESTAMP() WHERE id = ?",
                [nextEndAt, activeSubscription.id],
            );
        } else {
            await conn.execute(
                "INSERT INTO SeasonPassSubscription (id, userId, planId, status, startAt, endAt, createdAt, updatedAt) VALUES (?, ?, ?, 'ACTIVE', UTC_TIMESTAMP(), ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())",
                [crypto.randomUUID(), userId, plan.id, nextEndAt],
            );
        }

        await conn.commit();

        const currentSubscription = await getCurrentSeasonPassSubscription(userId);
        const endAt = currentSubscription?.endAt ?? nextEndAt;

        return NextResponse.json({
            success: true,
            message: "ซื้อ Season Pass สำเร็จ",
            endAt,
            endAtText: formatThaiDate(endAt),
        });
    } catch (error) {
        await conn.rollback();

        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "ไม่สามารถซื้อ Season Pass ได้",
            },
            { status: 400 },
        );
    } finally {
        conn.release();
    }
}
