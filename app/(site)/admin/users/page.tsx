import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import AdminUsersClient from "./AdminUsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
    const access = await requirePermission(PERMISSIONS.USER_VIEW);
    if (!access.success) {
        redirect("/admin?error=คุณไม่มีสิทธิ์ดูผู้ใช้");
    }

    const userList = await db.query.users.findMany({
        orderBy: (t, { desc }) => desc(t.createdAt),
        columns: {
            id: true, username: true, name: true, email: true, phone: true, image: true,
            role: true, creditBalance: true, totalTopup: true,
            pointBalance: true, lifetimePoints: true, createdAt: true,
            pinHash: true, pinLockedUntil: true, pinUpdatedAt: true,
        },
    });

    const serializedUsers = userList.map((user) => ({
        ...user,
        creditBalance: String(user.creditBalance ?? "0"),
        totalTopup: String(user.totalTopup ?? "0"),
        hasPin: Boolean(user.pinHash),
        pinLockedUntil: user.pinLockedUntil,
        pinUpdatedAt: user.pinUpdatedAt,
        // Drizzle returns datetime as string — ensure ISO format
        createdAt: typeof user.createdAt === "string" ? user.createdAt : new Date(user.createdAt as string | number | Date).toISOString(),
    }));

    return <AdminUsersClient initialUsers={serializedUsers} />;
}
