"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Package,
    Users,
    FileCheck,
    Settings,
    LogOut,
    Gamepad2,
    Newspaper,
    FileText,
} from "lucide-react";

const sidebarLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/products", label: "Product Manager", icon: Package },
    { href: "/admin/news", label: "News Manager", icon: Newspaper },
    { href: "/admin/users", label: "User Manager", icon: Users },
    { href: "/admin/slips", label: "Slip Verification", icon: FileCheck },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
    { href: "/admin/settings", label: "Site Settings", icon: Settings },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-slate-900 text-white">
            {/* Logo */}
            <div className="flex h-16 items-center border-b border-slate-800 px-6">
                <Link href="/admin" className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                        <Gamepad2 className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-lg font-bold">Admin Panel</span>
                </Link>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 space-y-1 px-3 py-4">
                {sidebarLinks.map((link) => {
                    const isActive = pathname === link.href ||
                        (link.href !== "/admin" && pathname.startsWith(link.href));
                    const Icon = link.icon;

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                                ? "bg-primary text-white"
                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                }`}
                        >
                            <Icon className="h-5 w-5" />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Back to Shop */}
            <div className="border-t border-slate-800 p-3">
                <Link
                    href="/"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                >
                    <LogOut className="h-5 w-5" />
                    Back to Shop
                </Link>
            </div>
        </aside>
    );
}
