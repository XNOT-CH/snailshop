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
    Share2,
    ChevronRight,
    Gamepad2,
    Lock,
    UserPlus,
    Menu,
} from "lucide-react";

interface NavLink {
    href: string;
    label: string;
    icon: React.ElementType;
    hasChildren?: boolean;
}

interface NavigationDrawerProps {
    navLinks: NavLink[];
    user?: {
        username: string;
        creditBalance: string | number;
    } | null;
    siteName?: string;
    logoUrl?: string;
    categories?: string[];
}

export function NavigationDrawer({
    navLinks,
    user,
    siteName = "GameStore",
    logoUrl,
    categories = [],
}: NavigationDrawerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const pathname = usePathname();

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    const toggleExpand = (href: string) => {
        setExpandedItems((prev) =>
            prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
        );
    };

    const iconMap: Record<string, React.ElementType> = {
        "/": Home,
        "/shop": ShoppingBag,
        "/dashboard": LayoutDashboard,
        "/help": HelpCircle,
        "/gachapons": Dices,
        "/dashboard/topup": Wallet,
        "/profile": User,
        "/share": Share2,
    };

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

    return (
        <>
            {/* Hamburger Button */}
            <button
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                aria-label="เปิดเมนู"
                onClick={() => setIsOpen(true)}
            >
                <Menu className="h-5 w-5" />
            </button>

            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-[60] bg-black/70 transition-opacity duration-300 md:hidden ${
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={() => setIsOpen(false)}
            />

            {/* Drawer Panel */}
            <aside
                style={{ background: "#0c1929" }}
                className={`fixed top-0 left-0 z-[70] h-full w-[300px] flex flex-col transition-transform duration-300 ease-in-out md:hidden ${
                    isOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                {/* Header */}
                <div
                    style={{ background: "#0f2035", borderBottom: "1px solid #1e3a5f" }}
                    className="flex items-center justify-between px-5 py-4"
                >
                    <Link href="/" className="flex items-center gap-2.5" onClick={() => setIsOpen(false)}>
                        {logoUrl ? (
                            <Image
                                src={logoUrl}
                                alt={siteName}
                                width={36}
                                height={36}
                                className="rounded-lg object-contain h-9 w-9"
                            />
                        ) : (
                            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center">
                                <Gamepad2 className="h-5 w-5 text-white" />
                            </div>
                        )}
                        <span className="text-white font-bold text-base tracking-tight">{siteName}</span>
                    </Link>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                        aria-label="ปิดเมนู"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Auth Buttons / User Card */}
                <div className="px-4 py-4" style={{ borderBottom: "1px solid #1e3a5f" }}>
                    {user ? (
                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#1a3050" }}>
                            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-lg flex-shrink-0">
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-semibold truncate">{user.username}</p>
                                <p className="text-blue-300 text-sm">฿{Number(user.creditBalance).toLocaleString()}</p>
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

                {/* Nav Links */}
                <nav className="flex-1 overflow-y-auto py-2">
                    {/* Main nav from DB */}
                    {navLinks.map((link) => {
                        const Icon = iconMap[link.href] || link.icon || Home;
                        const active = isActive(link.href) && link.href !== "/";
                        const exactActive = pathname === link.href;
                        const showActive = link.href === "/" ? exactActive : active;
                        const isShop = link.href === "/shop";
                        const isExpanded = expandedItems.includes(link.href);

                        return (
                            <div key={link.href}>
                                {isShop && categories.length > 0 ? (
                                    <>
                                        <button
                                            onClick={() => toggleExpand(link.href)}
                                            className={`w-full flex items-center gap-4 px-5 py-3.5 text-sm font-medium transition-colors ${
                                                showActive
                                                    ? "bg-blue-600 text-white border-l-4 border-blue-300"
                                                    : "text-gray-300 hover:bg-white/5 border-l-4 border-transparent"
                                            }`}
                                        >
                                            <Icon className="h-5 w-5 flex-shrink-0" />
                                            <span className="flex-1 text-left">{link.label}</span>
                                            <ChevronRight
                                                className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                            />
                                        </button>
                                        {isExpanded && (
                                            <div style={{ background: "#0a1623" }} className="pb-1">
                                                {categories.map((cat) => (
                                                    <Link
                                                        key={cat}
                                                        href={`/shop?category=${encodeURIComponent(cat)}`}
                                                        className="flex items-center gap-4 pl-14 pr-5 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                                        onClick={() => setIsOpen(false)}
                                                    >
                                                        {cat}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <Link
                                        href={link.href}
                                        className={`flex items-center gap-4 px-5 py-3.5 text-sm font-medium transition-colors ${
                                            showActive
                                                ? "bg-blue-600 text-white border-l-4 border-blue-300"
                                                : "text-gray-300 hover:bg-white/5 border-l-4 border-transparent"
                                        }`}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <Icon className="h-5 w-5 flex-shrink-0" />
                                        <span className="flex-1">{link.label}</span>
                                    </Link>
                                )}
                            </div>
                        );
                    })}

                    {/* Extra links for logged-in users */}
                    {user && (
                        <>
                            <div className="my-2 mx-4" style={{ height: "1px", background: "#1e3a5f" }} />
                            <Link
                                href="/dashboard/topup"
                                className={`flex items-center gap-4 px-5 py-3.5 text-sm font-medium transition-colors ${
                                    pathname === "/dashboard/topup"
                                        ? "bg-blue-600 text-white border-l-4 border-blue-300"
                                        : "text-gray-300 hover:bg-white/5 border-l-4 border-transparent"
                                }`}
                                onClick={() => setIsOpen(false)}
                            >
                                <Wallet className="h-5 w-5 flex-shrink-0" />
                                <span>เติมเงิน</span>
                            </Link>
                            <Link
                                href="/profile/settings"
                                className={`flex items-center gap-4 px-5 py-3.5 text-sm font-medium transition-colors ${
                                    pathname.startsWith("/profile")
                                        ? "bg-blue-600 text-white border-l-4 border-blue-300"
                                        : "text-gray-300 hover:bg-white/5 border-l-4 border-transparent"
                                }`}
                                onClick={() => setIsOpen(false)}
                            >
                                <User className="h-5 w-5 flex-shrink-0" />
                                <span>โปรไฟล์</span>
                            </Link>
                        </>
                    )}
                </nav>

                {/* Footer */}
                {user && (
                    <div className="px-4 py-4" style={{ borderTop: "1px solid #1e3a5f" }}>
                        <form action="/api/auth/signout" method="POST">
                            <button
                                type="submit"
                                className="w-full py-2.5 rounded-lg text-sm font-medium text-red-400 border border-red-800 hover:bg-red-900/30 transition-colors"
                            >
                                ออกจากระบบ
                            </button>
                        </form>
                    </div>
                )}
            </aside>
        </>
    );
}
