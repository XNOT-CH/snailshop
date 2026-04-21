import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPermissionsProvider } from "@/components/admin/AdminPermissionsProvider";
import { HideMainLayout } from "@/components/HideMainLayout";
import { buildPageMetadata } from "@/lib/seo";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

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
    const access = await requirePermission(PERMISSIONS.ADMIN_PANEL);
    if (!access.success) {
        if (access.error === "ไม่ได้เข้าสู่ระบบ" || access.error === "ไม่พบข้อมูลผู้ใช้งาน") {
            redirect("/login?error=กรุณาเข้าสู่ระบบก่อน");
        }

        redirect("/?error=คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
    }

    if (!access.permissions) {
        redirect("/?error=คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
    }

    return (
        <div className="admin-console flex min-h-screen bg-muted">
            <HideMainLayout />
            <AdminSidebar permissions={access.permissions} />

            <main className="ml-0 w-full min-h-screen flex-1 animate-page-enter pt-14 md:ml-72 md:pt-0">
                <div className="px-3 py-3 sm:px-4 md:px-6 md:py-6 lg:px-8">
                    <div className="admin-console-shell mx-auto w-full max-w-[1600px] rounded-2xl bg-card p-4 shadow-sm sm:p-5 md:p-7">
                        <AdminPermissionsProvider permissions={access.permissions}>
                            {children}
                        </AdminPermissionsProvider>
                    </div>
                </div>
            </main>
        </div>
    );
}
