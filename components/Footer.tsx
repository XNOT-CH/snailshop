import Link from "next/link";
import Image from "next/image";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { db, footerLinks } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
    Gamepad2, ChevronRight, Phone, Mail, Facebook, Twitter, Instagram, MessageCircle,
} from "lucide-react";
import { resolveSiteName } from "@/lib/seo";
import { sanitizePublicFooterLinks } from "@/lib/footerLinks";
import { cacheOrFetch, CACHE_KEYS } from "@/lib/cache";
import { APP_VERSION } from "@/lib/version";

async function getFooterData() {
    try {
        // Footer is global and rarely edited; cache across requests (short TTL)
        // so it doesn't hit MySQL on every page load via the shared layout.
        const [settings, links] = await Promise.all([
            cacheOrFetch(
                CACHE_KEYS.FOOTER_WIDGET,
                async () => (await db.query.footerWidgetSettings.findFirst()) ?? null,
                60,
            ),
            cacheOrFetch(
                CACHE_KEYS.FOOTER_LINKS,
                async () =>
                    db.query.footerLinks.findMany({
                        where: eq(footerLinks.isActive, true),
                        orderBy: (t, { asc }) => asc(t.sortOrder),
                    }),
                60,
            ),
        ]);
        return { settings, links };
    } catch {
        return { settings: null, links: [] };
    }
}

type PublicLink = { id: string; label: string; href: string; column: string; openInNewTab: boolean };

function LinkList({ links }: Readonly<{ links: PublicLink[] }>) {
    if (links.length === 0) {
        return <p className="text-sm text-muted-foreground">ยังไม่มีลิงก์</p>;
    }
    return (
        <ul className="space-y-2.5">
            {links.map((link) => {
                const className =
                    "group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary";
                const inner = (
                    <>
                        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-0.5" />
                        {link.label}
                    </>
                );
                return (
                    <li key={link.id}>
                        {link.openInNewTab ? (
                            <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
                                {inner}
                            </a>
                        ) : (
                            <Link href={link.href} prefetch={false} className={className}>
                                {inner}
                            </Link>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

export default async function Footer() {
    const siteSettings = await getSiteSettings();
    const { settings: widget, links } = await getFooterData();
    const currentYear = new Date().getFullYear();
    const siteName = resolveSiteName(siteSettings?.heroTitle);

    const showLinkColumns = widget?.isActive ?? true;
    const safeLinks = showLinkColumns ? (sanitizePublicFooterLinks(links) as PublicLink[]) : [];
    const servicesLinks = safeLinks.filter((link) => link.column !== "cards");
    const cardsLinks = safeLinks.filter((link) => link.column === "cards");

    const servicesTitle = widget?.title || "บริการของเรา";
    const cardsTitle = widget?.secondaryTitle || "บัตรเติมเกม";

    const socials = [
        { url: siteSettings?.facebookUrl, Icon: Facebook, label: "Facebook" },
        { url: siteSettings?.twitterUrl, Icon: Twitter, label: "Twitter" },
        { url: siteSettings?.instagramUrl, Icon: Instagram, label: "Instagram" },
        { url: siteSettings?.lineUrl, Icon: MessageCircle, label: "LINE" },
    ].filter((social): social is { url: string; Icon: typeof Facebook; label: string } =>
        Boolean(social.url && social.url.trim() !== ""),
    );

    return (
        <footer className="relative border-t border-border/60 bg-card/55 backdrop-blur-xl">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
                    {/* Brand + disclaimer + social */}
                    <div className="sm:col-span-2 lg:col-span-1">
                        <Link href="/" prefetch={false} className="mb-4 inline-flex items-center gap-3">
                            {siteSettings?.logoUrl ? (
                                <Image src={siteSettings.logoUrl} alt="Logo" width={48} height={48} className="h-12 w-12 rounded-xl object-contain" />
                            ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70">
                                    <Gamepad2 className="h-6 w-6 text-primary-foreground" />
                                </div>
                            )}
                            <span className="text-xl font-bold text-foreground">{siteName}</span>
                        </Link>
                        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                            {siteSettings?.footerDescription ||
                                "แพลตฟอร์มซื้อขายสินค้าดิจิทัลที่น่าเชื่อถือ พร้อมระบบรักษาความปลอดภัยมาตรฐานสากล"}
                        </p>
                        {socials.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2.5">
                                {socials.map(({ url, Icon, label }) => (
                                    <a
                                        key={label}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={label}
                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                                    >
                                        <Icon className="h-[18px] w-[18px]" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Services column */}
                    {showLinkColumns && (
                        <div>
                            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">{servicesTitle}</h4>
                            <LinkList links={servicesLinks} />
                        </div>
                    )}

                    {/* Cards column */}
                    {showLinkColumns && (
                        <div>
                            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">{cardsTitle}</h4>
                            <LinkList links={cardsLinks} />
                        </div>
                    )}

                    {/* Contact column */}
                    <div>
                        <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">ติดต่อเรา</h4>
                        <ul className="space-y-4">
                            {siteSettings?.contactPhone && (
                                <li className="flex items-center gap-3">
                                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <Phone className="h-5 w-5" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground">โทรศัพท์</p>
                                        <a href={`tel:${siteSettings.contactPhone}`} className="font-semibold text-foreground hover:text-primary">
                                            {siteSettings.contactPhone}
                                        </a>
                                    </div>
                                </li>
                            )}
                            {siteSettings?.contactEmail && (
                                <li className="flex items-center gap-3">
                                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <Mail className="h-5 w-5" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground">อีเมล</p>
                                        <a href={`mailto:${siteSettings.contactEmail}`} className="truncate font-semibold text-foreground hover:text-primary">
                                            {siteSettings.contactEmail}
                                        </a>
                                    </div>
                                </li>
                            )}
                            {!siteSettings?.contactPhone && !siteSettings?.contactEmail && (
                                <li className="text-sm text-muted-foreground">ยังไม่ได้ตั้งค่าช่องทางติดต่อ</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="bg-gradient-to-r from-primary/90 via-primary to-blue-500 text-primary-foreground">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center justify-between gap-3 py-4 text-sm md:flex-row">
                        <p className="text-center text-primary-foreground/90">
                            Copyright © {currentYear} {siteName} - All Rights Reserved.
                            <span className="ml-2 text-xs text-primary-foreground/60">v{APP_VERSION}</span>
                        </p>
                        <div className="flex items-center gap-5">
                            <Link href="/privacy" prefetch={false} className="text-primary-foreground/85 transition-colors hover:text-primary-foreground">
                                นโยบายความเป็นส่วนตัว
                            </Link>
                            <Link href="/terms" prefetch={false} className="text-primary-foreground/85 transition-colors hover:text-primary-foreground">
                                ข้อกำหนดการใช้งาน
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
