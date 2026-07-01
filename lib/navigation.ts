import {
    Dices,
    Gift,
    HelpCircle,
    Home,
    LayoutDashboard,
    Settings,
    ShoppingBag,
    User,
    Wallet,
    type LucideIcon,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Single source of truth for the primary site navigation.
//
// Every nav surface (desktop Navbar, NavigationDrawer, MobileBottomNav)
// reads icons, active-state matching, and labels from here so the same
// destination always looks and behaves the same across breakpoints.
// ─────────────────────────────────────────────────────────────

/** Map a DB-configured `NavItem.icon` string → lucide icon. */
export const NAV_ICON_BY_NAME: Record<string, LucideIcon> = {
    home: Home,
    shop: ShoppingBag,
    dashboard: LayoutDashboard,
    help: HelpCircle,
    wallet: Wallet,
    user: User,
    settings: Settings,
    dices: Dices,
    gacha: Dices,
    gift: Gift,
    season: Gift,
    "season-pass": Gift,
};

/** Map a known href → lucide icon (for hardcoded surfaces like the drawer). */
export const NAV_ICON_BY_HREF: Record<string, LucideIcon> = {
    "/home": Home,
    "/shop": ShoppingBag,
    "/gachapons": Dices,
    "/season-pass": Gift,
    "/dashboard": LayoutDashboard,
    "/dashboard/topup": Wallet,
    "/help": HelpCircle,
    "/profile": User,
    "/profile/settings": User,
};

export function navIconByName(name?: string | null): LucideIcon {
    return NAV_ICON_BY_NAME[name?.toLowerCase() ?? ""] ?? Home;
}

export function navIconByHref(href: string): LucideIcon {
    return NAV_ICON_BY_HREF[href] ?? Home;
}

// ─── Active-state matching ────────────────────────────────────
// Per-destination rules so e.g. a product page lights up "ร้านค้า"
// and any /gacha* page lights up the gacha entry — identically on
// every surface.
const NAV_MATCHERS: Record<string, (pathname: string) => boolean> = {
    "/home": (p) => p === "/home" || p === "/",
    "/shop": (p) => p === "/shop" || p.startsWith("/shop/") || p.startsWith("/product"),
    "/gachapons": (p) => p.startsWith("/gacha"),
    "/season-pass": (p) => p === "/season-pass" || p.startsWith("/season-pass/"),
    "/dashboard": (p) => p.startsWith("/dashboard") || p.startsWith("/profile"),
    "/help": (p) => p === "/help" || p.startsWith("/help/"),
};

/** Whether a primary nav link should render as active for the given path. */
export function isNavActive(href: string, pathname: string): boolean {
    const matcher = NAV_MATCHERS[href];
    if (matcher) return matcher(pathname);
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
}

// ─── Canonical labels ─────────────────────────────────────────
// `label` is the full label (desktop / drawer); `shortLabel` is the
// compact label for the mobile bottom bar. Use these wherever labels
// are hardcoded so the same destination is never named two ways.
export interface PrimaryNavEntry {
    href: string;
    label: string;
    shortLabel: string;
}

export const PRIMARY_NAV = {
    home: { href: "/home", label: "หน้าแรก", shortLabel: "หน้าแรก" },
    shop: { href: "/shop", label: "ร้านค้า", shortLabel: "ร้านค้า" },
    gacha: { href: "/gachapons", label: "หมวดหมู่กาชา", shortLabel: "กาชา" },
    seasonPass: { href: "/season-pass", label: "Season Pass", shortLabel: "Pass" },
    dashboard: { href: "/dashboard", label: "บัญชี", shortLabel: "บัญชี" },
    help: { href: "/help", label: "ช่วยเหลือ", shortLabel: "ช่วยเหลือ" },
} as const satisfies Record<string, PrimaryNavEntry>;

/** Canonical label for the top-up action (used across menus). */
export const TOPUP_LABEL = "เติมเงิน";
