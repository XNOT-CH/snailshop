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
    LayoutDashboard,
    Wallet,
    Package,
    Settings,
    ArrowLeft,
    Gamepad2,
} from "lucide-react";

interface DashboardSidebarProps {
    user: {
        username: string;
        email: string | null;
        creditBalance?: number | bigint | any;
    } | null;
}

const sidebarLinks = [
    { href: "/dashboard", label: "ภาพรวม", icon: LayoutDashboard },
    { href: "/dashboard/topup", label: "เติมเงิน", icon: Wallet },
    { href: "/dashboard/inventory", label: "สินค้าของฉัน", icon: Package },
    { href: "/dashboard/settings", label: "ตั้งค่า", icon: Settings },
];

export function DashboardSidebar({ user }: DashboardSidebarProps) {
    const pathname = usePathname();

    return (
        <TooltipProvider>
            <aside className="fixed left-0 top-0 z-40 hidden md:flex h-screen w-64 flex-col border-r border-border bg-card">
                {/* Logo */}
                <div className="flex h-16 items-center border-b px-6">
                    <Link href="/" className="flex items-center gap-2 font-bold text-lg">
                        <Gamepad2 className="h-5 w-5 text-primary" />
                        GameStore
                    </Link>
                </div>

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
                                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
        </TooltipProvider>
    );
}
