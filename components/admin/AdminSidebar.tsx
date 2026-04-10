"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    ChevronDown,
    FileCheck,
    FileSpreadsheet,
    FileText,
    Gamepad2,
    Gem,
    Gift,
    Layers,
    LayoutDashboard,
    LinkIcon,
    LogOut,
    Megaphone,
    Menu,
    MessagesSquare,
    Newspaper,
    Package,
    Settings,
    Shield,
    Ticket,
    Users,
} from "lucide-react";

type NavItem = {
    href: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
    requiredPermission?: Permission;
};

type NavGroup = {
    label: string;
    icon: React.ElementType;
    items: NavItem[];
    requiredPermission?: Permission;
};

type NavEntry = NavItem | ({ group: true } & NavGroup);

type NavSection = {
    title: string;
    hint: string;
    items: NavEntry[];
};

function isNavGroup(entry: NavEntry): entry is ({ group: true } & NavGroup) {
    return "group" in entry && entry.group === true;
}

const navigationSections: NavSection[] = [
    {
        title: "ใช้งานบ่อย",
        hint: "เมนูที่แอดมินเปิดบ่อยที่สุด",
        items: [
            { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard, badge: "หลัก", requiredPermission: PERMISSIONS.DASHBOARD_VIEW },
            { href: "/admin/chat", label: "แชทลูกค้า", icon: MessagesSquare, badge: "สด", requiredPermission: PERMISSIONS.CHAT_VIEW },
            { href: "/admin/slips", label: "ตรวจสอบสลิป", icon: FileCheck, requiredPermission: PERMISSIONS.SLIP_VIEW },
        ],
    },
    {
        title: "จัดการร้าน",
        hint: "สินค้า ผู้ใช้ และสิทธิ์พิเศษ",
        items: [
            { href: "/admin/products", label: "จัดการสินค้า", icon: Package, requiredPermission: PERMISSIONS.PRODUCT_VIEW },
            { href: "/admin/promo-codes", label: "โค้ดส่วนลด", icon: Ticket, requiredPermission: PERMISSIONS.PROMO_VIEW },
            { href: "/admin/season-pass", label: "Season Pass", icon: Gift, requiredPermission: PERMISSIONS.SEASON_PASS_VIEW },
            { href: "/admin/users", label: "จัดการผู้ใช้", icon: Users, requiredPermission: PERMISSIONS.USER_VIEW },
            { href: "/admin/roles", label: "จัดการสิทธิ์", icon: Shield, requiredPermission: PERMISSIONS.USER_MANAGE_ROLE },
            {
                group: true,
                label: "กาชา",
                icon: Gamepad2,
                requiredPermission: PERMISSIONS.GACHA_VIEW,
                items: [
                    { href: "/admin/gacha-machines", label: "หมวดหมู่กาชา", icon: Layers, requiredPermission: PERMISSIONS.GACHA_VIEW },
                    { href: "/admin/season-pass", label: "Season Pass Box", icon: Gift, requiredPermission: PERMISSIONS.SEASON_PASS_VIEW },
                ],
            },
        ],
    },
    {
        title: "คอนเทนต์",
        hint: "สิ่งที่ลูกค้าเห็นบนหน้าร้าน",
        items: [
            { href: "/admin/news", label: "จัดการข่าวสาร", icon: Newspaper, requiredPermission: PERMISSIONS.CONTENT_VIEW },
            { href: "/admin/popups", label: "จัดการป๊อปอัพ", icon: Megaphone, requiredPermission: PERMISSIONS.CONTENT_VIEW },
            { href: "/admin/footer-links", label: "ลิงก์ท้ายเว็บ", icon: LinkIcon, requiredPermission: PERMISSIONS.SETTINGS_VIEW },
        ],
    },
    {
        title: "ตั้งค่าและระบบ",
        hint: "เครื่องมือหลังบ้านและค่าระบบ",
        items: [
            { href: "/admin/currency-settings", label: "ตั้งค่าสกุลเงิน", icon: Gem, requiredPermission: PERMISSIONS.SETTINGS_VIEW },
            { href: "/admin/export", label: "ส่งออกข้อมูล", icon: FileSpreadsheet, requiredPermission: PERMISSIONS.EXPORT_DATA },
            { href: "/admin/audit-logs", label: "บันทึกการใช้งาน", icon: FileText, requiredPermission: PERMISSIONS.AUDIT_LOG_VIEW },
            { href: "/admin/settings", label: "ตั้งค่าเว็บไซต์", icon: Settings, requiredPermission: PERMISSIONS.SETTINGS_VIEW },
        ],
    },
];

function canAccessEntry(entry: NavEntry, permissions: Set<string>) {
    if (isNavGroup(entry)) {
        if (entry.requiredPermission && !permissions.has(entry.requiredPermission)) {
            return false;
        }

        return entry.items.some((item) => canAccessEntry(item, permissions));
    }

    return !entry.requiredPermission || permissions.has(entry.requiredPermission);
}

function NavLink({
    href,
    label,
    icon: Icon,
    active,
    onClick,
    sub = false,
    badge,
}: Readonly<{
    href: string;
    label: string;
    icon: React.ElementType;
    active: boolean;
    onClick?: () => void;
    sub?: boolean;
    badge?: string;
}>) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={[
                "group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-150",
                sub ? "py-2 text-[13px]" : "",
                active
                    ? "border-transparent bg-[#eef4ff] text-[#145de7]"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900",
            ].join(" ")}
        >
            <span
                className={[
                    "absolute bottom-2 left-0 top-2 w-0.5 rounded-r-full transition-opacity duration-150",
                    active ? "bg-[#145de7] opacity-100" : "opacity-0",
                ].join(" ")}
            />
            <Icon
                className={[
                    "relative z-10 flex-shrink-0",
                    sub ? "h-4 w-4" : "h-[18px] w-[18px]",
                    active ? "text-[#145de7]" : "text-slate-400 group-hover:text-slate-600",
                ].join(" ")}
            />
            <span className="relative z-10 flex-1 truncate">{label}</span>
            {badge ? (
                <span
                    className={[
                        "relative z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em]",
                        active ? "bg-white/90 text-[#145de7]" : "bg-slate-100 text-slate-500",
                    ].join(" ")}
                >
                    {badge}
                </span>
            ) : null}
        </Link>
    );
}

function NavGroup({
    group,
    pathname,
    onLinkClick,
}: Readonly<{
    group: NavGroup;
    pathname: string;
    onLinkClick?: () => void;
}>) {
    const anyActive = group.items.some((item) => pathname === item.href || pathname.startsWith(item.href));
    const [open, setOpen] = useState(anyActive);
    const Icon = group.icon;

    return (
        <div className="space-y-1">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className={[
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    anyActive
                        ? "border-transparent bg-slate-50 text-slate-900"
                        : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900",
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

            {open ? (
                <div className="ml-4 space-y-1 border-l border-slate-200/80 pl-3">
                    {group.items.map((item) => {
                        const active = pathname === item.href || pathname.startsWith(item.href);

                        return (
                            <NavLink
                                key={item.href}
                                href={item.href}
                                label={item.label}
                                icon={item.icon}
                                badge={item.badge}
                                active={active}
                                onClick={onLinkClick}
                                sub
                            />
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}

function SidebarSection({
    title,
    hint,
    items,
    pathname,
    onLinkClick,
}: Readonly<{
    title: string;
    hint: string;
    items: NavEntry[];
    pathname: string;
    onLinkClick?: () => void;
}>) {
    return (
        <section className="space-y-2">
            <div className="px-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</p>
                <p className="mt-1 max-w-[15rem] text-[11px] leading-5 text-slate-400">{hint}</p>
            </div>

            <div className="space-y-1">
                {items.map((entry) => {
                    if (isNavGroup(entry)) {
                        return (
                            <NavGroup
                                key={entry.label}
                                group={entry}
                                pathname={pathname}
                                onLinkClick={onLinkClick}
                            />
                        );
                    }

                    const active =
                        pathname === entry.href ||
                        (entry.href !== "/admin" && pathname.startsWith(entry.href));

                    return (
                        <NavLink
                            key={entry.href}
                            href={entry.href}
                            label={entry.label}
                            icon={entry.icon}
                            badge={entry.badge}
                            active={active}
                            onClick={onLinkClick}
                        />
                    );
                })}
            </div>
        </section>
    );
}

function SidebarNav({
    onLinkClick,
    permissions,
}: Readonly<{ onLinkClick?: () => void; permissions: string[] }>) {
    const pathname = usePathname();
    const permissionSet = new Set(permissions);
    const visibleSections = navigationSections
        .map((section) => ({
            ...section,
            items: section.items.filter((entry) => canAccessEntry(entry, permissionSet)),
        }))
        .filter((section) => section.items.length > 0);

    return (
        <>
            <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
                {visibleSections.map((section) => (
                    <SidebarSection
                        key={section.title}
                        title={section.title}
                        hint={section.hint}
                        items={section.items}
                        pathname={pathname}
                        onLinkClick={onLinkClick}
                    />
                ))}
            </nav>

            <div className="border-t border-slate-200 p-4">
                <Link
                    href="/"
                    onClick={onLinkClick}
                    className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                    <LogOut className="h-[18px] w-[18px] text-slate-400" />
                    กลับหน้าร้าน
                </Link>
            </div>
        </>
    );
}

export function AdminSidebar({ permissions }: Readonly<{ permissions: string[] }>) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 flex-col border-r border-slate-200 bg-white shadow-sm md:flex">
                <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#145de7] shadow-sm">
                        <Gamepad2 className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-[15px] font-bold tracking-tight text-slate-900">แผงควบคุม</p>
                        <p className="truncate text-[11px] text-slate-400">จัดการร้านและระบบหลังบ้าน</p>
                    </div>
                </div>

                <SidebarNav permissions={permissions} />
            </aside>

            <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm md:hidden">
                <Link href="/admin" className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#145de7]">
                        <Gamepad2 className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-base font-bold text-slate-900">ผู้ดูแล</span>
                </Link>

                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            aria-label="เปิดเมนูผู้ดูแลระบบ"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>

                    <SheetContent side="left" className="w-[min(19rem,88vw)] border-slate-200 bg-white p-0 sm:w-80">
                        <SheetHeader className="flex h-16 shrink-0 flex-row items-center gap-3 space-y-0 border-b border-slate-200 px-5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#145de7]">
                                <Gamepad2 className="h-4 w-4 text-white" />
                            </div>
                            <div className="min-w-0 text-left">
                                <SheetTitle className="truncate text-[15px] font-bold text-slate-900">
                                    แผงควบคุม
                                </SheetTitle>
                                <p className="truncate text-[11px] text-slate-400">จัดการร้านและระบบหลังบ้าน</p>
                            </div>
                        </SheetHeader>

                        <div className="flex h-[calc(100%-4rem)] flex-col">
                            <SidebarNav permissions={permissions} onLinkClick={() => setOpen(false)} />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </>
    );
}
