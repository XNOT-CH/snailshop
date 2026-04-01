
import { auth } from "@/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HideMainLayout } from "@/components/HideMainLayout";

export default async function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // Get logged-in user from NextAuth session
    const session = await auth();
    const userId = session?.user?.id;

    let user = null;
    if (userId) {
        const dbUser = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { username: true, email: true, creditBalance: true },
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
        <div className="flex min-h-screen bg-muted">
            <HideMainLayout />
            {/* Sidebar */}
            <DashboardSidebar user={user} />

            {/* Main Content */}
            <main className="ml-0 min-h-screen flex-1 bg-muted px-3 pb-20 pt-3 sm:px-4 md:ml-64 md:px-6 md:pb-8 md:pt-6 lg:px-8">
                <ScrollArea className="h-full w-full">
                    <div className="page-transition mx-auto w-full max-w-screen-2xl rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5 md:p-7">
                        {children}
                    </div>
                </ScrollArea>
            </main>
        </div>
    );
}
