import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Get logged-in user from cookie
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    let user = null;
    if (userId) {
        const dbUser = await db.user.findUnique({
            where: { id: userId },
            select: {
                username: true,
                email: true,
                creditBalance: true,
            },
        });

        // Convert Decimal to plain number for client component
        if (dbUser) {
            user = {
                username: dbUser.username,
                email: dbUser.email,
                creditBalance: Number(dbUser.creditBalance),
            };
        }
    }

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <DashboardSidebar user={user} />

            {/* Main Content */}
            <main className="ml-0 md:ml-64 flex-1 p-4 md:p-8">
                <ScrollArea className="h-full">
                    <div className="page-transition">
                        {children}
                    </div>
                </ScrollArea>
            </main>
        </div>
    );
}
