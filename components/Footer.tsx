import Link from "next/link";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { Gamepad2, Home, ShoppingBag, LayoutDashboard, Wallet, HelpCircle, FileText, Shield } from "lucide-react";

export default async function Footer() {
    // Use cached site settings
    const siteSettings = await getSiteSettings();

    const currentYear = new Date().getFullYear();

    const menuLinks = [
        { href: "/", label: "หน้าแรก", icon: Home },
        { href: "/shop", label: "ร้านค้า", icon: ShoppingBag },
        { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
        { href: "/dashboard/topup", label: "เติมเงิน", icon: Wallet },
    ];

    const infoLinks = [
        { href: "#", label: "วิธีการสั่งซื้อ", icon: HelpCircle },
        { href: "#", label: "ข้อตกลงการใช้งาน", icon: FileText },
        { href: "#", label: "นโยบายความเป็นส่วนตัว", icon: Shield },
    ];

    return (
        <footer className="mt-12 border-t border-border/50 bg-card/90">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Logo & Description */}
                    <div className="md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            {siteSettings?.logoUrl ? (
                                <img
                                    src={siteSettings.logoUrl}
                                    alt="Logo"
                                    className="h-16 w-16 rounded-xl object-contain"
                                />
                            ) : (
                                <div className="h-16 w-16 rounded-xl bg-primary flex items-center justify-center">
                                    <Gamepad2 className="h-8 w-8 text-white" />
                                </div>
                            )}
                        </Link>
                        <h3 className="font-bold text-primary text-lg mb-2">
                            {siteSettings?.heroTitle || "GameStore"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {siteSettings?.heroDescription || "แหล่งซื้อขายไอดีเกมที่ปลอดภัยที่สุด"}
                        </p>
                    </div>

                    {/* Menu Links */}
                    <div>
                        <h4 className="font-semibold text-primary mb-4">เมนูหลัก</h4>
                        <ul className="space-y-2">
                            {menuLinks.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <li key={link.href}>
                                        <Link
                                            href={link.href}
                                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            <Icon className="h-4 w-4" />
                                            {link.label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Info Links */}
                    <div>
                        <h4 className="font-semibold text-primary mb-4">ข้อมูลอื่นๆ</h4>
                        <ul className="space-y-2">
                            {infoLinks.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <li key={link.label}>
                                        <Link
                                            href={link.href}
                                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            <Icon className="h-4 w-4" />
                                            {link.label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Contact / Social */}
                    <div>
                        <h4 className="font-semibold text-primary mb-4">ติดต่อเรา</h4>
                        <div className="space-y-3">
                            {/* Discord Button */}
                            <a
                                href="#"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-[#5865F2] text-white rounded-xl text-sm font-medium hover:bg-[#4752C4] transition-colors w-fit"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                </svg>
                                Discord
                            </a>
                            <p className="text-xs text-muted-foreground">
                                เข้าร่วม Discord เพื่อรับข่าวสารและโปรโมชั่น
                            </p>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="mt-10 pt-6 border-t border-border">
                    <p className="text-center text-sm text-muted-foreground">
                        © {currentYear} {siteSettings?.heroTitle || "GameStore"}. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
