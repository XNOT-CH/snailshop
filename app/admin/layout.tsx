
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { HideMainLayout } from "@/components/HideMainLayout";

export default async function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // Get user ID from NextAuth session
    const session = await auth();
    const userId = session?.user?.id;

    // If no user is logged in, redirect to login
    if (!userId) {
        redirect("/login?error=กรุณาเข้าสู่ระบบก่อน");
    }

    // Check if user exists and has ADMIN role
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { id: true, role: true },
    });

    // If user not found or not an admin, redirect to home
    if (!user) {
        redirect("/login?error=ไม่พบผู้ใช้งาน");
    }

    if (user.role !== "ADMIN") {
        redirect("/?error=คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
    }

    // User is authenticated and is an admin - render the layout
    return (
        <div className="flex min-h-screen bg-muted">
            <HideMainLayout />
            {/* Fixed Sidebar */}
            <AdminSidebar />

            {/* Main Content — full width next to sidebar */}
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
