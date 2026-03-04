import Link from "next/link";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { db, footerWidgetSettings, footerLinks } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
    Gamepad2, Home, ShoppingBag, HelpCircle, Mail, Shield, FileText, ChevronRight,
} from "lucide-react";

async function getFooterWidget() {
    try {
        const settings = await db.query.footerWidgetSettings.findFirst();
        if (!settings || !settings.isActive) return { settings: null, links: [] };
        const links = await db.query.footerLinks.findMany({
            where: eq(footerLinks.isActive, true),
            orderBy: (t, { asc }) => asc(t.sortOrder),
        });
        return { settings, links };
    } catch {
        return { settings: null, links: [] };
    }
}

export default async function Footer() {
    const siteSettings = await getSiteSettings();
    const footerWidget = await getFooterWidget();
    const currentYear = new Date().getFullYear();
    const siteName = siteSettings?.heroTitle || "GameStore";
    const menuLinks = [
        { href: "/", label: "หน้าหลัก", icon: Home },
        { href: "/shop", label: "สินค้าทั้งหมด", icon: ShoppingBag },
        { href: "/help", label: "ศูนย์ช่วยเหลือ", icon: HelpCircle },
    ];
    const companyLinks = [
        { href: "/terms", label: "ข้อตกลงการใช้งาน", icon: FileText },
        { href: "/privacy", label: "นโยบายความเป็นส่วนตัว", icon: Shield },
        { href: "/contact", label: "ติดต่อเรา", icon: Mail },
    ];

    return (
        <footer className="relative bg-white/60 dark:bg-card/60 backdrop-blur-sm border-t border-border/50">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
                    <div className="lg:col-span-1">
                        <Link href="/" className="inline-flex items-center gap-3 mb-4 group">
                            {siteSettings?.logoUrl ? (
                                <img src={siteSettings.logoUrl} alt="Logo" className="h-12 w-12 rounded-xl object-contain shadow-lg ring-2 ring-primary/20 transition-all duration-300 group-hover:ring-primary/50" />
                            ) : (
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                                    <Gamepad2 className="h-6 w-6 text-primary-foreground" />
                                </div>
                            )}
                            <span className="font-bold text-xl text-foreground">{siteName}</span>
                        </Link>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                            {siteSettings?.heroDescription || "แพลตฟอร์มซื้อขายสินค้าดิจิทัลที่น่าเชื่อถือ พร้อมระบบรักษาความปลอดภัยมาตรฐานสากล"}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2.5 py-1 rounded-full border border-green-500/20">
                                <Shield className="h-3 w-3" />ปลอดภัย 100%
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                                <Gamepad2 className="h-3 w-3" />สินค้าคุณภาพ
                            </span>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground text-sm uppercase tracking-wider mb-4">เมนูหลัก</h4>
                        <ul className="space-y-2.5">
                            {menuLinks.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <li key={link.href}>
                                        <Link href={link.href} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group">
                                            <ChevronRight className="h-3 w-3 text-primary opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                                            <Icon className="h-4 w-4" />{link.label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground text-sm uppercase tracking-wider mb-4">
                            {footerWidget.settings?.title || "ข้อมูลสำคัญ"}
                        </h4>
                        <ul className="space-y-2.5">
                            {footerWidget.settings && footerWidget.links.length > 0 ? (
                                footerWidget.links.map((link) => (
                                    <li key={link.id}>
                                        {link.openInNewTab ? (
                                            <a href={link.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group">
                                                <ChevronRight className="h-3 w-3 text-primary opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                                                <FileText className="h-4 w-4" />{link.label}
                                            </a>
                                        ) : (
                                            <Link href={link.href} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group">
                                                <ChevronRight className="h-3 w-3 text-primary opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                                                <FileText className="h-4 w-4" />{link.label}
                                            </Link>
                                        )}
                                    </li>
                                ))
                            ) : (
                                companyLinks.map((link) => {
                                    const Icon = link.icon;
                                    return (
                                        <li key={link.href}>
                                            <Link href={link.href} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group">
                                                <ChevronRight className="h-3 w-3 text-primary opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                                                <Icon className="h-4 w-4" />{link.label}
                                            </Link>
                                        </li>
                                    );
                                })
                            )}
                        </ul>
                    </div>
                </div>
                <div className="py-5 border-t border-border">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>© {currentYear}</span>
                            <span className="text-primary font-medium">{siteName}</span>
                            <span>สงวนลิขสิทธิ์</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                ระบบพร้อมให้บริการ
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
