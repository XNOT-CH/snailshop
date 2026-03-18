"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    X,
    Home,
    ShoppingBag,
    LayoutDashboard,
    HelpCircle,
    Dices,
    Wallet,
    User,
    ChevronRight,
    Gamepad2,
    Lock,
    UserPlus,
    Menu,
    LogOut,
} from "lucide-react";

interface SerializableNavLink {
    href: string;
    label: string;
}

interface NavigationDrawerProps {
    navLinks?: SerializableNavLink[];
    user?: {
        username: string;
        creditBalance: number;
    } | null;
    siteName?: string;
    logoUrl?: string;
    categories?: string[];
}

const DEFAULT_NAV: SerializableNavLink[] = [
    { href: "/", label: "หน้าแรก" },
    { href: "/shop", label: "ร้านค้า" },
    { href: "/gachapons", label: "หมวดหมู่กาชา" },
    { href: "/dashboard", label: "แดชบอร์ด" },
    { href: "/help", label: "ช่วยเหลือ" },
];

const ICON_MAP: Record<string, React.ElementType> = {
    "/": Home,
    "/shop": ShoppingBag,
    "/gachapons": Dices,
    "/dashboard": LayoutDashboard,
    "/dashboard/topup": Wallet,
    "/help": HelpCircle,
    "/profile": User,
    "/profile/settings": User,
};

function NavIcon({ href }: { href: string }) {
    const Icon = ICON_MAP[href] ?? Home;
    return <Icon className="h-5 w-5 flex-shrink-0" />;
}

export function NavigationDrawer({
    navLinks,
    user,
    siteName = "GameStore",
    logoUrl,
    categories = [],
}: NavigationDrawerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [shopExpanded, setShopExpanded] = useState(false);
    const pathname = usePathname();

    const links = navLinks && navLinks.length > 0 ? navLinks : DEFAULT_NAV;

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    const isActive = (href: string) =>
        href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

    return (
        <>
            {/* Hamburger */}
            <button
                onClick={() => setIsOpen(true)}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                aria-label="เปิดเมนู"
            >
                <Menu className="h-5 w-5" />
            </button>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[998] bg-black/70 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Drawer */}
            <div
                className={`fixed top-0 left-0 z-[999] h-svh w-[290px] flex flex-col md:hidden transition-transform duration-300 ease-in-out ${
                    isOpen ? "translate-x-0" : "-translate-x-full"
                }`}
                style={{ background: "#0c1929" }}
            >
                {/* ── Header ── */}
                <div
                    className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ background: "#0f2035", borderBottom: "1px solid #1a3a5c" }}
                >
                    <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5">
                        {logoUrl ? (
                            <Image src={logoUrl} alt={siteName} width={34} height={34} className="rounded-lg object-contain" />
                        ) : (
                            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center">
                                <Gamepad2 className="h-5 w-5 text-white" />
                            </div>
                        )}
                        <span className="text-white font-bold text-base">{siteName}</span>
                    </Link>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-white transition-colors p-1"
                        aria-label="ปิด"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* ── Auth / User ── */}
                <div className="px-4 py-4 flex-shrink-0" style={{ borderBottom: "1px solid #1a3a5c" }}>
                    {user ? (
                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#1a3050" }}>
                            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-lg flex-shrink-0">
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-semibold truncate">{user.username}</p>
                                <p className="text-blue-300 text-sm">
                                    ฿{Number(user.creditBalance).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <Link
                                href="/login"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                            >
                                <Lock className="h-4 w-4" />
                                เข้าสู่ระบบ
                            </Link>
                            <Link
                                href="/register"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-gray-500 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
                            >
                                <UserPlus className="h-4 w-4" />
                                สมัครสมาชิก
                            </Link>
                        </div>
                    )}
                </div>

                {/* ── Nav Links (scrollable) ── */}
                <nav className="flex-1 overflow-y-auto py-1">
                    {links.map((link) => {
                        const active = isActive(link.href);
                        const isShop = link.href === "/shop" && categories.length > 0;

                        if (isShop) {
                            return (
                                <div key={link.href}>
                                    <button
                                        onClick={() => setShopExpanded((v) => !v)}
                                        className={`w-full flex items-center gap-4 px-5 py-3.5 text-sm font-medium transition-colors border-l-4 ${
                                            active
                                                ? "bg-blue-600 text-white border-blue-300"
                                                : "text-gray-300 hover:bg-white/5 border-transparent"
                                        }`}
                                    >
                                        <NavIcon href={link.href} />
                                        <span className="flex-1 text-left">{link.label}</span>
                                        <ChevronRight
                                            className={`h-4 w-4 transition-transform duration-200 ${shopExpanded ? "rotate-90" : ""}`}
                                        />
                                    </button>
                                    {shopExpanded && (
                                        <div style={{ background: "#0a1623" }}>
                                            {categories.map((cat) => (
                                                <Link
                                                    key={cat}
                                                    href={`/shop?category=${encodeURIComponent(cat)}`}
                                                    className="flex items-center pl-14 pr-5 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                                    onClick={() => setIsOpen(false)}
                                                >
                                                    {cat}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-4 px-5 py-3.5 text-sm font-medium transition-colors border-l-4 ${
                                    active
                                        ? "bg-blue-600 text-white border-blue-300"
                                        : "text-gray-300 hover:bg-white/5 border-transparent"
                                }`}
                            >
                                <NavIcon href={link.href} />
                                <span className="flex-1">{link.label}</span>
                            </Link>
                        );
                    })}

                    {/* Extra account links for logged-in users */}
                    {user && (
                        <>
                            <div className="my-1 mx-4" style={{ height: "1px", background: "#1a3a5c" }} />
                            <Link
                                href="/dashboard/topup"
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-4 px-5 py-3.5 text-sm font-medium transition-colors border-l-4 ${
                                    pathname === "/dashboard/topup"
                                        ? "bg-blue-600 text-white border-blue-300"
                                        : "text-gray-300 hover:bg-white/5 border-transparent"
                                }`}
                            >
                                <Wallet className="h-5 w-5 flex-shrink-0" />
                                <span className="flex-1">เติมเงิน</span>
                            </Link>
                            <Link
                                href="/profile/settings"
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-4 px-5 py-3.5 text-sm font-medium transition-colors border-l-4 ${
                                    pathname.startsWith("/profile")
                                        ? "bg-blue-600 text-white border-blue-300"
                                        : "text-gray-300 hover:bg-white/5 border-transparent"
                                }`}
                            >
                                <User className="h-5 w-5 flex-shrink-0" />
                                <span className="flex-1">โปรไฟล์</span>
                            </Link>
                        </>
                    )}
                </nav>

                {/* ── Footer ── */}
                {user && (
                    <div className="px-4 py-4 flex-shrink-0" style={{ borderTop: "1px solid #1a3a5c" }}>
                        <form action="/api/auth/signout" method="POST">
                            <button
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-red-400 border border-red-800 hover:bg-red-900/30 transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                ออกจากระบบ
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </>
    );
}
