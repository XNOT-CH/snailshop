import { db } from "@/lib/db";
import AdminUsersClient from "./AdminUsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
    const userList = await db.query.users.findMany({
        orderBy: (t, { desc }) => desc(t.createdAt),
        columns: {
            id: true, username: true, name: true, email: true, image: true,
            role: true, creditBalance: true, totalTopup: true,
            pointBalance: true, lifetimePoints: true, createdAt: true,
        },
    });

    const serializedUsers = userList.map((user) => ({
        ...user,
        creditBalance: String(user.creditBalance ?? "0"),
        totalTopup: String(user.totalTopup ?? "0"),
        // Drizzle returns datetime as string — ensure ISO format
        createdAt: typeof user.createdAt === "string" ? user.createdAt : new Date(user.createdAt as any).toISOString(),
    }));

    return <AdminUsersClient initialUsers={serializedUsers} />;
}
