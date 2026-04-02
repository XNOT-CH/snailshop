import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { HideMainLayout } from "@/components/HideMainLayout";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
    title: "แอดมิน",
    path: "/admin",
    noIndex: true,
});

export default async function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        redirect("/login?error=กรุณาเข้าสู่ระบบก่อน");
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { id: true, role: true },
    });

    if (!user) {
        redirect("/login?error=ไม่พบผู้ใช้งาน");
    }

    if (user.role !== "ADMIN") {
        redirect("/?error=คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
    }

    return (
        <div className="flex min-h-screen bg-muted">
            <HideMainLayout />
            <AdminSidebar />

            <main className="ml-0 w-full min-h-screen flex-1 animate-page-enter pt-14 md:ml-64 md:pt-0">
                <div className="px-3 py-3 sm:px-4 md:px-6 md:py-6 lg:px-8">
                    <div className="mx-auto w-full max-w-[1600px] rounded-2xl bg-card p-4 shadow-sm sm:p-5 md:p-7">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
