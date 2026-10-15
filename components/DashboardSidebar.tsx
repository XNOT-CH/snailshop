"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, CreditCard, Dices, Gift, Package, Settings, Wallet } from "lucide-react";
import { PRIMARY_NAV } from "@/lib/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface DashboardSidebarProps {
    user: {
        name?: string | null;
        username: string;
        email: string | null;
        image?: string | null;
        creditBalance?: number | bigint;
    } | null;
}

const sidebarLinks = [
    { href: "/dashboard/topup", label: "เติมเงิน", icon: CreditCard },
    { href: PRIMARY_NAV.gacha.href, label: PRIMARY_NAV.gacha.label, icon: Dices },
    { href: "/dashboard/season-pass", label: "Season Pass", icon: Gift },
    { href: "/dashboard/wallet", label: "กระเป๋าเงิน", icon: Wallet },
    { href: "/dashboard/inventory", label: "คลังสินค้าของฉัน", icon: Package },
    { href: "/dashboard/settings", label: "ตั้งค่าบัญชี", icon: Settings },
];

export function DashboardSidebar({ user }: Readonly<DashboardSidebarProps>) {
    const pathname = usePathname();
    const shownName = user?.name?.trim() || user?.username || "Guest";

    return (
        <TooltipProvider>
            <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-border/60 bg-card md:flex">
                <div className="p-4">
                    <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                        <Avatar>
                            <AvatarImage src={user?.image || undefined} alt={shownName} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                                {shownName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{shownName}</p>
                            {user?.username ? (
                                <p className="mt-0.5 text-xs text-muted-foreground">@{user.username}</p>
                            ) : null}
                            <p className="mt-1 text-sm font-semibold text-[var(--page-heading)]">
                                ฿{user?.creditBalance ? Number(user.creditBalance).toLocaleString() : "0"}
                            </p>
                        </div>
                    </div>
                </div>

                <ScrollArea className="flex-1 px-3 py-4">
                    <nav className="flex flex-col gap-1">
                        {sidebarLinks.map((link) => {
                            const isActive =
                                pathname === link.href ||
                                (link.href !== "/dashboard" && pathname.startsWith(link.href));
                            const Icon = link.icon;

                            return (
                                <Tooltip key={link.href}>
                                    <TooltipTrigger asChild>
                                        <Link
                                            href={link.href}
                                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-300 ease-out touch-feedback ${
                                                isActive
                                                    ? "bg-primary/10 font-semibold text-primary"
                                                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                                            }`}
                                        >
                                            <Icon className="h-5 w-5" />
                                            {link.label}
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">{link.label}</TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </nav>
                </ScrollArea>

                <div className="p-3">
                    <Link
                        href="/"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-300 ease-out hover:bg-primary/5 hover:text-primary"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        กลับหน้าร้าน
                    </Link>
                </div>
            </aside>
        </TooltipProvider>
    );
}
