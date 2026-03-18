"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Wallet,
    Package,
    Settings,
    ArrowLeft,
} from "lucide-react";

interface DashboardSidebarProps {
    user: {
        username: string;
        email: string | null;
        creditBalance?: number | bigint;
    } | null;
}

const sidebarLinks = [
    { href: "/dashboard/topup", label: "เติมเงิน", icon: Wallet },
    { href: "/dashboard/inventory", label: "สินค้าของฉัน", icon: Package },
    { href: "/dashboard/settings", label: "ตั้งค่า", icon: Settings },
];

export function DashboardSidebar({ user }: Readonly<DashboardSidebarProps>) {
    const pathname = usePathname();

    return (
        <TooltipProvider>
            {/* Desktop Sidebar */}
            <aside className="fixed left-0 top-0 z-40 hidden md:flex h-screen w-64 flex-col border-r border-border bg-card">
                {/* User Info */}
                <div className="p-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                        <Avatar>
                            <AvatarFallback className="bg-primary text-primary-foreground">
                                {user?.username?.charAt(0).toUpperCase() || "?"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                                {user?.username || "Guest"}
                            </p>
                            <Badge variant="secondary" className="text-xs mt-1">
                                ฿{user?.creditBalance ? Number(user.creditBalance).toLocaleString() : "0"}
                            </Badge>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Navigation */}
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
                                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 btn-press touch-feedback ${isActive
                                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                                                : "text-muted-foreground hover:bg-accent hover:text-foreground hover:translate-x-1"
                                                }`}
                                        >
                                            <Icon className="h-5 w-5" />
                                            {link.label}
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        {link.label}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </nav>
                </ScrollArea>

                <Separator />

                {/* Back to Shop */}
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

            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden items-center justify-around bg-card border-t border-border py-2 px-1">
                {sidebarLinks.map((link) => {
                    const isActive =
                        pathname === link.href ||
                        (link.href !== "/dashboard" && pathname.startsWith(link.href));
                    const Icon = link.icon;

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isActive
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                            <span className="truncate max-w-[4rem]">{link.label}</span>
                        </Link>
                    );
                })}
                <Link
                    href="/"
                    className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                    <span className="truncate max-w-[4rem]">ร้านค้า</span>
                </Link>
            </nav>
        </TooltipProvider>
    );
}
