"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Dices, Gift, HelpCircle, Home, Package, Settings, ShoppingBag, User, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { themeClasses } from "@/lib/theme";

const OPEN_CHAT_EVENT = "open-customer-chat";

const DEFAULT_NAV_ITEMS = [
    { href: "/home", label: "หน้าแรก", icon: Home, match: (pathname: string) => pathname === "/home" },
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
    { href: "/home", label: "หน้าร้าน", icon: ArrowLeft, match: () => false },
] as const;

const HIDDEN_PREFIXES = ["/admin", "/login", "/register"];

export function MobileBottomNav() {
    const pathname = usePathname();
    const isAccountRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/profile");
    const shouldHide = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    if (shouldHide) {
        return null;
    }

    const navItems = isAccountRoute ? ACCOUNT_NAV_ITEMS : DEFAULT_NAV_ITEMS;

    return (
        <nav
            id="main-mobile-nav"
            aria-label="เมนูหลักบนมือถือ"
            className={`${themeClasses.mobileNav} fixed inset-x-0 bottom-0 z-40 backdrop-blur-xl md:hidden`}
        >
            <div className="mx-auto flex h-[var(--mobile-bottom-nav-height)] max-w-7xl items-center justify-around px-1 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1.5">
                {navItems.map((item) => {
                    const isActive = item.match(pathname);
                    const Icon = item.icon;
                    const itemClassName = cn(
                        "group relative flex h-14 min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 overflow-hidden rounded-2xl px-1 py-1 text-[10px] font-medium transition-[color,transform] duration-300 ease-out active:scale-[0.96]",
                        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    );
                    const iconWrapperClassName = cn(
                        "relative z-10 flex h-8 w-8 items-center justify-center rounded-2xl transition-[background-color,color,box-shadow,transform] duration-300 ease-out group-active:scale-90",
                        isActive
                            ? "-translate-y-0.5 scale-105 bg-primary/12 text-primary shadow-sm"
                            : "text-current group-hover:-translate-y-0.5"
                    );
                    const labelClassName = cn(
                        "relative z-10 line-clamp-2 min-h-[1.35rem] text-center leading-[0.95rem] break-words transition-[opacity,transform] duration-300 ease-out",
                        isActive ? "translate-y-0 opacity-100" : "translate-y-0.5 opacity-85 group-hover:translate-y-0 group-hover:opacity-100"
                    );

                    if ("action" in item && item.action === "chat") {
                        return (
                            <button
                                key={item.href}
                                type="button"
                                onClick={() => globalThis.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT))}
                                className={itemClassName}
                            >
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        "absolute inset-x-2 bottom-1 top-1 rounded-2xl bg-primary/8 opacity-0 transition-[opacity,transform] duration-300 ease-out",
                                        isActive ? "scale-100 opacity-100" : "scale-75 group-hover:scale-95 group-hover:opacity-50"
                                    )}
                                />
                                <div className={iconWrapperClassName}>
                                    <Icon className="h-[18px] w-[18px]" />
                                </div>
                                <span className={labelClassName}>{item.label}</span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch={false}
                            className={itemClassName}
                        >
                            <span
                                aria-hidden="true"
                                className={cn(
                                    "absolute inset-x-2 bottom-1 top-1 rounded-2xl bg-primary/8 opacity-0 transition-[opacity,transform] duration-300 ease-out",
                                    isActive ? "scale-100 opacity-100" : "scale-75 group-hover:scale-95 group-hover:opacity-50"
                                )}
                            />
                            <div className={iconWrapperClassName}>
                                <Icon className="h-[18px] w-[18px]" />
                            </div>
                            <span className={labelClassName}>{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
