"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Menu,
    X,
    Home,
    ShoppingBag,
    LayoutDashboard,
    HelpCircle,
    Wallet,
    User,
    UserCog,
    Settings,
    Dices,
    LogOut,
    ChevronRight,
    Gamepad2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavLink {
    href: string;
    label: string;
    icon: React.ElementType;
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
    categories = [],
}: NavigationDrawerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    // Close drawer on route change
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Prevent body scroll when drawer is open
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

    const iconMap: Record<string, React.ElementType> = {
        "/": Home,
        "/shop": ShoppingBag,
        "/dashboard": LayoutDashboard,
        "/help": HelpCircle,
        "/gachapons": Dices,
    };

    return (
        <>
            {/* Hamburger Button */}
            <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-xl text-muted-foreground hover:text-primary hover:bg-accent"
                aria-label="เปิดเมนู Navigation Drawer"
                onClick={() => setIsOpen(true)}
            >
                <Menu className="h-5 w-5" />
            </Button>

            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
            />

            {/* Drawer Panel */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-[300px] bg-card border-r border-border shadow-2xl flex flex-col transition-transform duration-300 ease-in-out md:hidden ${
                    isOpen ? "translate-x-0" : "-translate-x-full"
                }`}
                aria-label="Navigation Drawer"
            >
                {/* Drawer Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
                    <Link
                        href="/"
                        className="flex items-center gap-2.5 font-bold text-primary"
                        onClick={() => setIsOpen(false)}
                    >
                        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
                            <Gamepad2 className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg tracking-tight text-foreground">{siteName}</span>
                    </Link>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl text-muted-foreground hover:text-primary hover:bg-accent"
                        onClick={() => setIsOpen(false)}
                        aria-label="ปิดเมนู"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                    {/* User Card */}
                    {user && (
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-accent/60 border border-border">
                            <Avatar className="h-11 w-11 border-2 border-primary shadow">
                                <AvatarFallback className="bg-primary text-primary-foreground text-base font-bold">
                                    {user.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground truncate">{user.username}</p>
                                <p className="text-sm text-muted-foreground">
                                    ฿{Number(user.creditBalance).toLocaleString()}
                                </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                    )}

                    {/* Main Nav Links */}
                    <div>
                        <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            เมนูหลัก
                        </p>
                        <nav className="flex flex-col gap-1">
                            {navLinks.map((link) => {
                                const Icon = iconMap[link.href] || link.icon || Home;
                                const isActive = pathname === link.href;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                            isActive
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:bg-accent hover:text-primary"
                                        }`}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <Icon className="h-5 w-5 flex-shrink-0" />
                                        <span>{link.label}</span>
                                        {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Shop Categories */}
                    {categories.length > 0 && (
                        <div>
                            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                หมวดหมู่สินค้า
                            </p>
                            <nav className="flex flex-col gap-1">
                                {categories.map((cat) => (
                                    <Link
                                        key={cat}
                                        href={`/shop?category=${encodeURIComponent(cat)}`}
                                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-accent hover:text-primary transition-all duration-200"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <ShoppingBag className="h-4 w-4 flex-shrink-0" />
                                        <span className="truncate">{cat}</span>
                                    </Link>
                                ))}
                            </nav>
                        </div>
                    )}

                    {/* Quick Links for logged-in users */}
                    {user && (
                        <div>
                            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                บัญชีของฉัน
                            </p>
                            <nav className="flex flex-col gap-1">
                                <Link
                                    href="/dashboard/topup"
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-primary transition-all duration-200"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <Wallet className="h-5 w-5" />
                                    เติมเงิน
                                </Link>
                                <Link
                                    href="/dashboard"
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-primary transition-all duration-200"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <User className="h-5 w-5" />
                                    แดชบอร์ด
                                </Link>
                                <Link
                                    href="/profile/settings"
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-primary transition-all duration-200"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <UserCog className="h-5 w-5" />
                                    แก้ไขโปรไฟล์
                                </Link>
                                <Link
                                    href="/dashboard/settings"
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-primary transition-all duration-200"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <Settings className="h-5 w-5" />
                                    ตั้งค่า
                                </Link>
                            </nav>
                        </div>
                    )}
                </div>

                {/* Drawer Footer */}
                <div className="px-3 py-4 border-t border-border">
                    {user ? (
                        <form action="/api/auth/signout" method="POST">
                            <button
                                type="submit"
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200"
                            >
                                <LogOut className="h-5 w-5" />
                                ออกจากระบบ
                            </button>
                        </form>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <Link href="/login" onClick={() => setIsOpen(false)}>
                                <Button variant="outline" className="w-full rounded-xl border-border text-muted-foreground hover:bg-accent">
                                    เข้าสู่ระบบ
                                </Button>
                            </Link>
                            <Link href="/register" onClick={() => setIsOpen(false)}>
                                <Button className="w-full rounded-xl">
                                    สมัครสมาชิก
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
