"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dices, HelpCircle, Home, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";

const OPEN_CHAT_EVENT = "open-customer-chat";

const NAV_ITEMS = [
    { href: "/", label: "หน้าแรก", icon: Home, match: (pathname: string) => pathname === "/" },
    { href: "/shop", label: "ร้านค้า", icon: ShoppingBag, match: (pathname: string) => pathname === "/shop" || pathname.startsWith("/product") },
    { href: "/gachapons", label: "กาชา", icon: Dices, match: (pathname: string) => pathname === "/gachapons" || pathname.startsWith("/gacha") },
    { href: "/help", label: "ติดต่อร้าน", icon: HelpCircle, match: (pathname: string) => pathname === "/help", action: "chat" as const },
    { href: "/dashboard", label: "บัญชี", icon: User, match: (pathname: string) => pathname.startsWith("/dashboard") || pathname.startsWith("/profile") },
] as const;

const HIDDEN_PREFIXES = ["/admin", "/dashboard", "/login", "/register"];

export function MobileBottomNav() {
    const pathname = usePathname();

    const shouldHide = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    if (shouldHide) {
        return null;
    }

    return (
        <nav
            id="main-mobile-nav"
            aria-label="เมนูหลักบนมือถือ"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-xl md:hidden"
        >
            <div className="mx-auto flex h-[72px] max-w-7xl items-start justify-around px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2">
                {NAV_ITEMS.map((item) => {
                    const isActive = item.match(pathname);
                    const Icon = item.icon;
                    const itemClassName = cn(
                        "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 text-[11px] font-medium transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    );
                    const iconWrapperClassName = cn(
                        "flex h-9 w-9 items-center justify-center rounded-2xl transition-colors",
                        isActive ? "bg-primary/12 text-primary" : "text-current"
                    );

                    if ("action" in item && item.action === "chat") {
                        return (
                            <button
                                key={item.href}
                                type="button"
                                onClick={() => window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT))}
                                className={itemClassName}
                            >
                                <div className={iconWrapperClassName}>
                                    <Icon className="h-[18px] w-[18px]" />
                                </div>
                                <span className="truncate leading-none">{item.label}</span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={itemClassName}
                        >
                            <div className={iconWrapperClassName}>
                                <Icon className="h-[18px] w-[18px]" />
                            </div>
                            <span className="truncate leading-none">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
