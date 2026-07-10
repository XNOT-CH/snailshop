"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, CreditCard, Dices, Gift, Home, Package, Settings, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { themeClasses } from "@/lib/theme";
import { PRIMARY_NAV, isNavActive } from "@/lib/navigation";

const DEFAULT_NAV_ITEMS = [
    { href: PRIMARY_NAV.home.href, label: PRIMARY_NAV.home.shortLabel, icon: Home, match: (pathname: string) => isNavActive(PRIMARY_NAV.home.href, pathname) },
    { href: PRIMARY_NAV.shop.href, label: PRIMARY_NAV.shop.shortLabel, icon: ShoppingBag, match: (pathname: string) => isNavActive(PRIMARY_NAV.shop.href, pathname) },
    { href: PRIMARY_NAV.gacha.href, label: PRIMARY_NAV.gacha.shortLabel, icon: Dices, match: (pathname: string) => isNavActive(PRIMARY_NAV.gacha.href, pathname) },
    { href: PRIMARY_NAV.seasonPass.href, label: PRIMARY_NAV.seasonPass.shortLabel, icon: Gift, match: (pathname: string) => isNavActive(PRIMARY_NAV.seasonPass.href, pathname) },
    { href: PRIMARY_NAV.dashboard.href, label: PRIMARY_NAV.dashboard.shortLabel, icon: User, match: (pathname: string) => isNavActive(PRIMARY_NAV.dashboard.href, pathname) },
] as const;

// Account-mode bar is capped at 5 items so labels stay legible on small
// phones. "หน้าร้าน" must keep a slot: the top navbar and the dashboard
// sidebar are both hidden on mobile dashboard routes, so it is the only way
// back to the store. "/dashboard" itself always redirects to inventory, and
// the wallet page lights up เติมเงิน (its nearest money-related tab).
const ACCOUNT_NAV_ITEMS = [
    { href: "/dashboard/topup", label: "เติมเงิน", icon: CreditCard, match: (pathname: string) => pathname.startsWith("/dashboard/topup") || pathname.startsWith("/dashboard/wallet") },
    { href: "/dashboard/season-pass", label: "พาส", icon: Gift, match: (pathname: string) => pathname.startsWith("/dashboard/season-pass") },
    { href: "/dashboard/inventory", label: "คลัง", icon: Package, match: (pathname: string) => pathname.startsWith("/dashboard/inventory") },
    { href: "/dashboard/settings", label: "บัญชี", icon: Settings, match: (pathname: string) => pathname.startsWith("/dashboard/settings") || pathname.startsWith("/profile") },
    { href: "/", label: "หน้าร้าน", icon: ArrowLeft, match: () => false },
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

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch={false}
                            className={itemClassName}
                            aria-current={isActive ? "page" : undefined}
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
