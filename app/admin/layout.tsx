import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { HideMainLayout } from "@/components/HideMainLayout";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Get user ID from cookies
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

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
            <main className="ml-0 md:ml-64 flex-1 pt-14 md:pt-0 w-full min-h-screen animate-page-enter">
                <div className="p-4 md:p-6 lg:p-8">
                    <div className="w-full max-w-[1600px] mx-auto bg-card rounded-2xl shadow-sm p-5 md:p-8">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
