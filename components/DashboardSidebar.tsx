"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Gift, Package, Settings, ShoppingBag, Wallet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
    { href: "/dashboard/topup", label: "เติมเงิน", icon: Wallet },
    { href: "/dashboard/season-pass", label: "Season Pass", icon: Gift },
    { href: "/dashboard/wallet", label: "กระเป๋าเงิน", icon: ShoppingBag },
    { href: "/dashboard/inventory", label: "คลังสินค้าของฉัน", icon: Package },
    { href: "/dashboard/settings", label: "ตั้งค่า", icon: Settings },
];

export function DashboardSidebar({ user }: Readonly<DashboardSidebarProps>) {
    const pathname = usePathname();
    const shownName = user?.name?.trim() || user?.username || "Guest";

    return (
        <TooltipProvider>
            <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-border bg-card md:flex">
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
                            <Badge variant="secondary" className="mt-1 text-xs">
                                ฿{user?.creditBalance ? Number(user.creditBalance).toLocaleString() : "0"}
                            </Badge>
                        </div>
                    </div>
                </div>

                <Separator />

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
                                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 btn-press touch-feedback ${
                                                isActive
                                                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                                                    : "text-muted-foreground hover:translate-x-1 hover:bg-accent hover:text-foreground"
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

                <Separator />

                <div className="p-3">
                    <Link
                        href="/"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        กลับหน้าร้าน
                    </Link>
                </div>
            </aside>
        </TooltipProvider>
    );
}
