import type { Metadata } from "next";
import { auth } from "@/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HideMainLayout } from "@/components/HideMainLayout";
import { buildPageMetadata } from "@/lib/seo";
import { ensureTicketBalanceColumn } from "@/lib/wallet";

export const metadata: Metadata = buildPageMetadata({
    title: "แดชบอร์ด",
    path: "/dashboard",
    noIndex: true,
});

export default async function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await auth();
    const userId = session?.user?.id;

    let user = null;
    if (userId) {
        await ensureTicketBalanceColumn();

        const dbUser = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { username: true, email: true, image: true, creditBalance: true, ticketBalance: true },
        });

        if (dbUser) {
            user = {
                username: dbUser.username,
                email: dbUser.email,
                image: dbUser.image,
                creditBalance: Number(dbUser.creditBalance),
            };
        }
    }

    return (
        <div className="flex min-h-screen bg-muted">
            <HideMainLayout />
            <DashboardSidebar user={user} />

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
