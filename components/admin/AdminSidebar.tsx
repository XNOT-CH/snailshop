"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetTitle,
    SheetHeader,
} from "@/components/ui/sheet";
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
    LinkIcon,
    Gem,
    Megaphone,
    Shield,
    Menu,
    Dices,
    Grid3X3,
    ChevronDown,
    Layers,
    Sliders,
} from "lucide-react";

// ── Navigation structure ───────────────────────────────────────────────────
type NavItem = { href: string; label: string; icon: React.ElementType };
type NavGroup = { label: string; icon: React.ElementType; items: NavItem[] };
type NavEntry = NavItem | ({ group: true } & NavGroup);

const navigation: NavEntry[] = [
    { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard },
    { href: "/admin/products", label: "จัดการสินค้า", icon: Package },
    { href: "/admin/news", label: "จัดการข่าวสาร", icon: Newspaper },
    { href: "/admin/popups", label: "จัดการป๊อปอัพ", icon: Megaphone },
    { href: "/admin/users", label: "จัดการผู้ใช้", icon: Users },
    { href: "/admin/roles", label: "จัดการสิทธิ์", icon: Shield },
    { href: "/admin/slips", label: "ตรวจสอบสลิป", icon: FileCheck },
    {
        group: true,
        label: "กาชา",
        icon: Gamepad2,
        items: [
            { href: "/admin/gacha-machines", label: "หมวดหมู่กาชา", icon: Layers },
        ],
    },
    { href: "/admin/currency-settings", label: "ตั้งค่าสกุลเงิน", icon: Gem },
    { href: "/admin/footer-links", label: "ลิงก์ท้ายเว็บ", icon: LinkIcon },
    { href: "/admin/audit-logs", label: "บันทึกการใช้งาน", icon: FileText },
    { href: "/admin/settings", label: "ตั้งค่าเว็บไซต์", icon: Settings },
];

// ── Single nav item ────────────────────────────────────────────────────────
function NavLink({ href, label, icon: Icon, active, onClick, sub = false }: {
    href: string; label: string; icon: React.ElementType;
    active: boolean; onClick?: () => void; sub?: boolean;
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={[
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                sub ? "py-2 text-[13px]" : "",
                active
                    ? "border border-[#145de7]/60 bg-[#eef4ff] text-[#145de7] shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-transparent",
            ].join(" ")}
        >
            <Icon className={["flex-shrink-0", sub ? "h-4 w-4" : "h-[18px] w-[18px]", active ? "text-[#145de7]" : "text-slate-400"].join(" ")} />
            {label}
        </Link>
    );
}

// ── Collapsible group ──────────────────────────────────────────────────────
function NavGroup({ group, pathname, onLinkClick }: {
    group: NavGroup; pathname: string; onLinkClick?: () => void;
}) {
    const anyActive = group.items.some(
        (i) => pathname === i.href || pathname.startsWith(i.href)
    );
    const [open, setOpen] = useState(anyActive);
    const Icon = group.icon;

    return (
        <div>
            <button
                onClick={() => setOpen((v) => !v)}
                className={[
                    "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 border",
                    anyActive
                        ? "border-slate-200 bg-slate-50 text-slate-700"
                        : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800",
                ].join(" ")}
            >
                <Icon className="h-[18px] w-[18px] flex-shrink-0 text-slate-400" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                    className={[
                        "h-4 w-4 text-slate-400 transition-transform duration-200",
                        open ? "rotate-180" : "",
                    ].join(" ")}
                />
            </button>

            {open && (
                <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-200 space-y-0.5">
                    {group.items.map((item) => {
                        const active = pathname === item.href || pathname.startsWith(item.href);
                        return (
                            <NavLink
                                key={item.href}
                                {...item}
                                active={active}
                                onClick={onLinkClick}
                                sub
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Sidebar nav contents ───────────────────────────────────────────────────
function SidebarNav({ onLinkClick }: { onLinkClick?: () => void }) {
    const pathname = usePathname();

    return (
        <>
            <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
                {navigation.map((entry, i) => {
                    if ("group" in entry && entry.group) {
                        return (
                            <NavGroup
                                key={`group-${i}`}
                                group={entry as NavGroup}
                                pathname={pathname}
                                onLinkClick={onLinkClick}
                            />
                        );
                    }
                    const item = entry as NavItem;
                    const active =
                        pathname === item.href ||
                        (item.href !== "/admin" && pathname.startsWith(item.href));
                    return (
                        <NavLink
                            key={item.href}
                            {...item}
                            active={active}
                            onClick={onLinkClick}
                        />
                    );
                })}
            </nav>

            {/* Back to Shop */}
            <div className="border-t border-slate-200 p-3">
                <Link
                    href="/"
                    onClick={onLinkClick}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 border border-transparent"
                >
                    <LogOut className="h-[18px] w-[18px] text-slate-400" />
                    กลับหน้าร้าน
                </Link>
            </div>
        </>
    );
}

// ── Main export ────────────────────────────────────────────────────────────
export function AdminSidebar() {
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="fixed left-0 top-0 z-40 hidden md:flex h-screen w-64 flex-col bg-white border-r border-slate-200 shadow-sm">
                {/* Logo */}
                <div className="flex h-16 items-center border-b border-slate-200 px-5 gap-3">
                    <div className="h-8 w-8 rounded-xl bg-[#145de7] flex items-center justify-center shadow-sm">
                        <Gamepad2 className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-[15px] font-bold text-slate-800 tracking-tight">แผงควบคุม</span>
                </div>

                <SidebarNav />
            </aside>

            {/* Mobile Header */}
            <div className="fixed top-0 left-0 right-0 z-40 flex md:hidden h-14 items-center justify-between bg-white border-b border-slate-200 px-4 shadow-sm">
                <Link href="/admin" className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-[#145de7] flex items-center justify-center">
                        <Gamepad2 className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-base font-bold text-slate-800">ผู้ดูแล</span>
                </Link>

                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800 hover:bg-slate-100">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0 bg-white border-slate-200">
                        <SheetHeader className="h-14 flex-row items-center border-b border-slate-200 px-5 gap-3 shrink-0 space-y-0">
                            <div className="h-7 w-7 rounded-lg bg-[#145de7] flex items-center justify-center">
                                <Gamepad2 className="h-3.5 w-3.5 text-white" />
                            </div>
                            <SheetTitle className="text-[15px] font-bold text-slate-800">แผงควบคุม</SheetTitle>
                        </SheetHeader>
                        <div className="flex flex-col h-[calc(100%-3.5rem)]">
                            <SidebarNav onLinkClick={() => setOpen(false)} />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </>
    );
}
