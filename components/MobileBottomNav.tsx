"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Dices, Gift, HelpCircle, Home, Package, Settings, ShoppingBag, User, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { themeClasses } from "@/lib/theme";

const OPEN_CHAT_EVENT = "open-customer-chat";

const DEFAULT_NAV_ITEMS = [
    { href: "/", label: "หน้าแรก", icon: Home, match: (pathname: string) => pathname === "/" },
    { href: "/shop", label: "ร้านค้า", icon: ShoppingBag, match: (pathname: string) => pathname === "/shop" || pathname.startsWith("/product") },
    { href: "/gachapons", label: "กาชา", icon: Dices, match: (pathname: string) => pathname === "/gachapons" || pathname.startsWith("/gacha") },
    { href: "/help", label: "ติดต่อร้าน", icon: HelpCircle, match: (pathname: string) => pathname === "/help", action: "chat" as const },
    { href: "/dashboard", label: "บัญชี", icon: User, match: (pathname: string) => pathname.startsWith("/dashboard") || pathname.startsWith("/profile") },
] as const;

const ACCOUNT_NAV_ITEMS = [
    { href: "/dashboard/topup", label: "เติมเงิน", icon: Wallet, match: (pathname: string) => pathname === "/dashboard/topup" },
    { href: "/dashboard/season-pass", label: "Pass", icon: Gift, match: (pathname: string) => pathname.startsWith("/dashboard/season-pass") },
    { href: "/dashboard/wallet", label: "กระเป๋า", icon: ShoppingBag, match: (pathname: string) => pathname.startsWith("/dashboard/wallet") },
    { href: "/dashboard/inventory", label: "คลัง", icon: Package, match: (pathname: string) => pathname.startsWith("/dashboard/inventory") },
    { href: "/dashboard/settings", label: "ตั้งค่า", icon: Settings, match: (pathname: string) => pathname.startsWith("/dashboard/settings") || pathname.startsWith("/profile") },
    { href: "/", label: "หน้าร้าน", icon: ArrowLeft, match: () => false },
] as const;

const HIDDEN_PREFIXES = ["/admin", "/login", "/register"];

export function MobileBottomNav() {
    const pathname = usePathname();
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isAccountRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/profile");

    const shouldHide = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolling(true);

            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
                scrollTimeoutRef.current = null;
            }, 180);
        };

        globalThis.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            globalThis.removeEventListener("scroll", handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    if (shouldHide) {
        return null;
    }

    const navItems = isAccountRoute ? ACCOUNT_NAV_ITEMS : DEFAULT_NAV_ITEMS;

    return (
        <nav
            id="main-mobile-nav"
            aria-label="เมนูหลักบนมือถือ"
            data-scrolling={isScrolling ? "true" : "false"}
            className={`${themeClasses.mobileNav} fixed inset-x-0 bottom-0 z-40 backdrop-blur-xl transition-[padding,transform] duration-200 md:hidden`}
        >
            <div
                className={cn(
                    "mx-auto flex max-w-7xl items-start justify-around px-1 pt-1.5 transition-[min-height,padding-bottom] duration-200",
                    isScrolling
                        ? "min-h-[72px] pb-1"
                        : "min-h-[var(--mobile-bottom-nav-height)] pb-[calc(env(safe-area-inset-bottom)+0.35rem)]"
                )}
            >
                {navItems.map((item) => {
                    const isActive = item.match(pathname);
                    const Icon = item.icon;
                    const itemClassName = cn(
                        "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[10px] font-medium transition-colors",
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
                                onClick={() => globalThis.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT))}
                                className={itemClassName}
                            >
                                <div className={iconWrapperClassName}>
                                    <Icon className="h-[18px] w-[18px]" />
                                </div>
                                <span className="line-clamp-2 min-h-[1.5rem] text-center leading-[0.75rem] break-words">{item.label}</span>
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
                            <span className="line-clamp-2 min-h-[1.5rem] text-center leading-[0.75rem] break-words">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
