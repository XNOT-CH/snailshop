import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

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
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
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
        <div className="flex min-h-screen">
            {/* Fixed Sidebar */}
            <AdminSidebar />

            {/* Main Content */}
            <main className="ml-64 flex-1 bg-gray-50 p-8 animate-page-enter">
                {children}
            </main>
        </div>
    );
}
