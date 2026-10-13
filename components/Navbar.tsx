import Link from "next/link";
import Image from "next/image";
import { BrandWordmark } from "@/components/BrandWordmark";
import { auth } from "@/auth";
import { db, users, navItems, products } from "@/lib/db";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { cacheOrFetch, CACHE_KEYS } from "@/lib/cache";
import { Button } from "@/components/ui/button";
import { ShopDropdown } from "@/components/ShopDropdown";
import { NavigationDrawer } from "@/components/NavigationDrawer";
import { NavbarInteractive } from "@/components/NavbarInteractive";
import { NavLink } from "@/components/NavLink";
import { Gamepad2, Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { resolveSiteName } from "@/lib/seo";
import { MobileAutoHideHeader } from "@/components/MobileAutoHideHeader";
import { themeClasses } from "@/lib/theme";
import { PRIMARY_NAV } from "@/lib/navigation";
import { NavbarSearch } from "@/components/NavbarSearch";
import { NavbarChatButton } from "@/components/NavbarChatButton";

function normalizeNavHref(href: string) {
    // Admin-managed nav items in the database may still say "/home";
    // the homepage now lives at "/".
    return href === "/home" ? "/" : href;
}

export default async function Navbar() {
    const session = await auth();
    const userId = session?.user?.id;

    const [user, siteSettings, dbNavItems, allProducts, currencySettings] = await Promise.all([
        userId
            ? db.query.users.findFirst({
                  where: eq(users.id, userId),
                  columns: { name: true, username: true, image: true, creditBalance: true, pointBalance: true },
              })
            : Promise.resolve(null),
        getSiteSettings(),
        // Global, identical for every visitor and rarely changed: cache across
        // requests (short TTL) so the shared navbar doesn't hit MySQL each load.
        cacheOrFetch(
            CACHE_KEYS.NAV_ITEMS,
            async () =>
                db.query.navItems.findMany({
                    where: eq(navItems.isActive, true),
                    orderBy: (table, { asc }) => asc(table.sortOrder),
                }),
            60,
        ),
        cacheOrFetch(
            CACHE_KEYS.PRODUCT_CATEGORIES,
            async () =>
                db.select({ category: products.category, categoryCount: count() })
                    .from(products)
                    .where(and(isNull(products.deletedAt), eq(products.isSold, false)))
                    .groupBy(products.category)
                    .orderBy(asc(products.category)),
            60,
        ),
        getCurrencySettings(),
    ]);
    const siteName = resolveSiteName(siteSettings?.heroTitle);

    const avatarVersion = user?.image ?? "default-avatar";

    const shopCategories = allProducts
        .map((product) => product.category)
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right));
    const drawerCategories = allProducts
        .filter((row) => Boolean(row.category))
        .map((row) => ({ name: row.category, count: Number(row.categoryCount ?? 0) }))
        .sort((left, right) => left.name.localeCompare(right.name));

    // When an admin has configured nav items in the DB, respect that list
    // exactly. Only the default (unconfigured) menu ships the full set
    // including the gacha hub and Season Pass — admins manage those via
    // /admin/nav-items instead of having them force-injected here.
    const navLinks = (
        dbNavItems.length > 0
            ? dbNavItems.map((item) => ({
                  href: normalizeNavHref(item.href),
                  label: item.label,
              }))
            : [
                  PRIMARY_NAV.home,
                  PRIMARY_NAV.shop,
                  PRIMARY_NAV.gacha,
                  PRIMARY_NAV.seasonPass,
                  PRIMARY_NAV.quests,
                  PRIMARY_NAV.dashboard,
                  PRIMARY_NAV.help,
              ].map((item) => ({
                  href: item.href,
                  label: item.label,
              }))
    // Daily quests are a logged-in feature; hide the entry from guests
    // (the /quests page itself also redirects them to /login).
    ).filter((item) => item.href !== "/quests" || Boolean(userId));

    return (
        <MobileAutoHideHeader>
        <header id="main-navbar" className={`${themeClasses.header} w-full md:backdrop-blur-xl`}>
            {/* auto|1fr|auto: side columns size to content so the right cluster
                (search + wallet) never outgrows a forced symmetric half and
                overlaps the last nav item. */}
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-4 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-4 lg:px-6 xl:px-8">
                <Link
                    href="/"
                    prefetch={false}
                    className="flex shrink-0 items-center gap-2.5 text-lg font-semibold text-primary xl:min-w-0"
                >
                    {siteSettings?.logoUrl ? (
                        <Image
                            src={siteSettings.logoUrl}
                            alt="Logo"
                            // Height-locked, width follows the art, so a wide logo reads at full
                            // size instead of shrinking into a square box.
                            width={160}
                            height={56}
                            priority
                            className="h-[34px] w-auto max-w-[110px] object-contain lg:h-8 xl:h-[34px]"
                        />
                    ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary sm:h-14 sm:w-14">
                            <Gamepad2 className="h-6 w-6 text-white sm:h-7 sm:w-7" />
                        </div>
                    )}
                    <BrandWordmark alt={siteName} className="hidden h-4 sm:block lg:h-[15px] xl:h-[17px]" />
                </Link>

                <nav className="hidden min-w-0 items-center justify-center gap-0.5 lg:flex">
                    {navLinks.map((link) => {
                        if (link.href === "/shop") {
                            return <ShopDropdown key={link.href} categories={shopCategories} />;
                        }

                        return (
                            <NavLink key={link.href} href={link.href}>
                                {link.label}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="flex shrink-0 items-center gap-1.5 lg:justify-self-end">
                    <NavbarSearch currencySettings={currencySettings} />
                    <NavbarChatButton />
                    {/* On mobile the theme switch lives inside the navigation
                        drawer instead, to keep the header row uncluttered. */}
                    <div className="hidden lg:block">
                        <ThemeToggle />
                    </div>
                    <NavbarInteractive
                        user={user ? {
                            name: user.name,
                            username: user.username,
                            image: user.image,
                            creditBalance: Number(user.creditBalance),
                            pointBalance: Number(user.pointBalance ?? 0),
                        } : null}
                        imageVersion={avatarVersion}
                        currencySettings={currencySettings}
                    />

                    {user ? (
                        <>
                            <Link href="/dashboard/topup" prefetch={false} className="hidden lg:block">
                                <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl font-medium text-muted-foreground hover:bg-accent hover:text-primary">
                                    <Wallet className="h-4 w-4 shrink-0 text-primary" />
                                    <span className="font-semibold text-foreground">
                                        ฿{Number(user.creditBalance).toLocaleString()}
                                    </span>
                                </Button>
                            </Link>
                        </>
                    ) : (
                        <div className="hidden items-center gap-2 lg:flex">
                            <Link href="/login" prefetch={false}>
                                <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground hover:bg-accent hover:text-primary">
                                    เข้าสู่ระบบ
                                </Button>
                            </Link>
                            <Link href="/register" prefetch={false}>
                                <Button size="sm" className="rounded-xl">
                                    สมัครสมาชิก
                                </Button>
                            </Link>
                        </div>
                    )}

                    <NavigationDrawer
                        navLinks={navLinks}
                        user={user ? {
                            name: user.name,
                            username: user.username,
                            image: user.image,
                            creditBalance: Number(user.creditBalance),
                            pointBalance: Number(user.pointBalance ?? 0),
                        } : null}
                        imageVersion={avatarVersion}
                        siteName={siteName}
                        logoUrl={siteSettings?.logoUrl || undefined}
                        categories={drawerCategories}
                        currencySettings={currencySettings}
                    />
                </div>
            </div>
        </header>
        </MobileAutoHideHeader>
    );
}
