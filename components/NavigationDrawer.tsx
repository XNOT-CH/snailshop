"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    X, Home, ShoppingBag, LayoutDashboard, HelpCircle,
    Dices, Wallet, User, ChevronRight, Gamepad2,
    Lock, UserPlus, Menu, LogOut, CircleDollarSign,
} from "lucide-react";
import { useLogout } from "@/components/useLogout";
import { withImageVersion } from "@/lib/imageUrl";

interface SerializableNavLink { href: string; label: string; }

interface NavigationDrawerProps {
    navLinks?: SerializableNavLink[];
    user?: { username: string; image?: string | null; creditBalance: number; } | null;
    imageVersion?: string | number;
    siteName?: string;
    logoUrl?: string;
    walletIconUrl?: string;
    categories?: string[];
}

// ─── User's color scheme ─────────────────────────────────
const PANEL_BG   = "#141c2f";   // dark charcoal navy
const HEADER_BG  = "#0e1628";   // darker header
const SECTION_BG = "#1a2338";   // slightly lighter nav section
const ACTIVE_BG  = "#1e4fcc";   // bright blue active
const BORDER     = "rgba(255,255,255,0.07)";

const DEFAULT_NAV: SerializableNavLink[] = [
    { href: "/",          label: "หน้าแรก" },
    { href: "/shop",      label: "ร้านค้า" },
    { href: "/gachapons", label: "หมวดหมู่กาชา" },
    { href: "/dashboard", label: "แดชบอร์ด" },
    { href: "/help",      label: "ช่วยเหลือ" },
];

const ICON_MAP: Record<string, React.ElementType> = {
    "/":                 Home,
    "/shop":             ShoppingBag,
    "/gachapons":        Dices,
    "/dashboard":        LayoutDashboard,
    "/dashboard/topup":  Wallet,
    "/help":             HelpCircle,
    "/profile":          User,
    "/profile/settings": User,
};

function NavIcon({ href }: { href: string }) {
    const Icon = ICON_MAP[href] ?? Home;
    return <Icon className="h-[19px] w-[19px] flex-shrink-0" />;
}

export function NavigationDrawer({
    navLinks, user, imageVersion, siteName = "GameStore", logoUrl, walletIconUrl, categories = [],
}: NavigationDrawerProps) {
    const [isOpen, setIsOpen]             = useState(false);
    const [mounted, setMounted]           = useState(false);
    const [shopExpanded, setShopExpanded] = useState(false);
    const [logoutPending, setLogoutPending] = useState(false);
    const pathname = usePathname();
    const logout = useLogout();
    const links = navLinks && navLinks.length > 0 ? navLinks : DEFAULT_NAV;

    const handleLogout = async () => {
        if (logoutPending) return;
        setLogoutPending(true);
        setIsOpen(false);
        try {
            await logout();
        } finally {
            setLogoutPending(false);
        }
    };

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => { setIsOpen(false); }, [pathname]);
    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    const isActive = (href: string) =>
        href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

    // ─── Portal content ───────────────────────────────────
    const portal = (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 z-[9998] bg-black/40 transition-opacity duration-300 ${
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={() => setIsOpen(false)}
            />

            {/* Drawer */}
            <aside
                className="fixed top-0 left-0 z-[9999] flex h-svh flex-col transition-transform duration-300 ease-in-out"
                style={{
                    background: PANEL_BG,
                    width: "min(290px, 85vw)",
                    transform: isOpen ? "translateX(0)" : "translateX(-100%)",
                    borderRight: `1px solid ${BORDER}`,
                }}
            >
                {/* ── Header ── */}
                <div
                    className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ background: HEADER_BG, borderBottom: `1px solid ${BORDER}` }}
                >
                    <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5">
                        {logoUrl ? (
                            <Image src={logoUrl} alt={siteName} width={32} height={32} className="rounded-lg object-contain" />
                        ) : (
                            <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center">
                                <Gamepad2 className="h-4 w-4 text-white" />
                            </div>
                        )}
                        <span className="text-white font-bold text-sm tracking-widest uppercase">{siteName}</span>
                    </Link>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                        aria-label="ปิด"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* ── User Card ── */}
                <div className="px-4 py-5 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}`, background: HEADER_BG }}>
                    {user ? (
                        <div className="flex flex-col gap-3">
                            {/* Avatar + Info */}
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-white/15 border-2 border-white/20 overflow-hidden flex items-center justify-center flex-shrink-0">
                                    {user.image ? (
                                        <Image
                                            src={withImageVersion(user.image, imageVersion) ?? user.image}
                                            alt={user.username}
                                            width={48}
                                            height={48}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-base font-bold text-white/85">
                                            {user.username.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold text-sm tracking-wide uppercase truncate">{user.username}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <CircleDollarSign className="h-3.5 w-3.5 text-blue-300" />
                                        <span className="text-blue-300 text-xs font-medium">
                                            เครดิต: {Number(user.creditBalance).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {/* Topup Button */}
                            <Link
                                href="/dashboard/topup"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                                style={{ background: ACTIVE_BG }}
                            >
                                {walletIconUrl ? (
                                    <Image src={walletIconUrl} alt="wallet" width={16} height={16} className="h-4 w-4 object-contain" />
                                ) : (
                                    <Wallet className="h-4 w-4" />
                                )}
                                เติมเครดิต
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <Link href="/login" onClick={() => setIsOpen(false)}
                                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                                style={{ background: ACTIVE_BG }}>
                                <Lock className="h-4 w-4" /> เข้าสู่ระบบ
                            </Link>
                            <Link href="/register" onClick={() => setIsOpen(false)}
                                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white transition-all"
                                style={{ border: `1px solid ${BORDER}` }}>
                                <UserPlus className="h-4 w-4" /> สมัครสมาชิก
                            </Link>
                        </div>
                    )}
                </div>

                {/* ── Nav Links ── */}
                <nav className="flex-1 overflow-y-auto pt-1 pb-2" style={{ background: SECTION_BG }}>
                    {links.map((link) => {
                        const active = isActive(link.href);
                        const isShop = link.href === "/shop" && categories.length > 0;
                        const inactiveStyle = { color: "rgba(255,255,255,0.80)" };
                        const activeStyle   = { background: ACTIVE_BG, color: "#fff" };

                        if (isShop) {
                            return (
                                <div key={link.href}>
                                    <button
                                        onClick={() => setShopExpanded((v) => !v)}
                                        className="w-full flex items-center gap-3.5 px-5 py-3.5 text-sm font-medium transition-colors"
                                        style={active ? activeStyle : inactiveStyle}
                                    >
                                        <NavIcon href={link.href} />
                                        <span className="flex-1 text-left">{link.label}</span>
                                        <ChevronRight className={`h-4 w-4 opacity-50 transition-transform duration-200 ${shopExpanded ? "rotate-90" : ""}`} />
                                    </button>
                                    {shopExpanded && (
                                        <div style={{ background: "rgba(0,0,0,0.15)" }}>
                                            {categories.map((cat) => (
                                                <Link key={cat}
                                                    href={`/shop?category=${encodeURIComponent(cat)}`}
                                                    className="flex items-center pl-12 pr-5 py-2.5 text-xs hover:bg-white/5 transition-colors"
                                            style={{ color: "rgba(255,255,255,0.55)" }}
                                                    onClick={() => setIsOpen(false)}>
                                                    {cat}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <Link key={link.href} href={link.href}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3.5 px-5 py-3.5 text-sm font-medium transition-colors"
                                style={active ? activeStyle : inactiveStyle}
                            >
                                <NavIcon href={link.href} />
                                <span className="flex-1">{link.label}</span>
                            </Link>
                        );
                    })}

                    {/* Extra account links */}
                    {user && (
                        <>
                            <div className="my-1 mx-4" style={{ height: "1px", background: "rgba(0,0,0,0.08)" }} />
                            <Link href="/profile/settings" onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3.5 px-5 py-3.5 text-sm font-medium transition-colors"
                                style={pathname.startsWith("/profile") ? { background: ACTIVE_BG, color: "#fff" } : { color: "rgba(255,255,255,0.80)" }}>
                                <User className="h-[19px] w-[19px] flex-shrink-0" />
                                <span className="flex-1">โปรไฟล์</span>
                            </Link>
                        </>
                    )}
                </nav>

                {/* ── Footer ── */}
                {user && (
                    <div className="px-4 py-4 flex-shrink-0" style={{ borderTop: `1px solid ${BORDER}`, background: HEADER_BG }}>
                        <button
                            type="button"
                            onClick={handleLogout}
                            disabled={logoutPending}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all"
                            style={{ border: `1px solid ${BORDER}` }}
                        >
                            <LogOut className="h-4 w-4" /> ออกจากระบบ
                        </button>
                    </div>
                )}
            </aside>
        </>
    );

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-primary xl:hidden"
                aria-label="เปิดเมนู"
            >
                <Menu className="h-5 w-5" />
            </button>
            {mounted && createPortal(portal, document.body)}
        </>
    );
}
