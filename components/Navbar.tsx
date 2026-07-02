import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { db, users, navItems, products } from "@/lib/db";
import { asc, eq } from "drizzle-orm";
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
import { PRIMARY_NAV, navIconByHref, navIconByName } from "@/lib/navigation";
import { NavbarSearch } from "@/components/NavbarSearch";

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
                db.select({ category: products.category })
                    .from(products)
                    .where(eq(products.isSold, false))
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

    // When an admin has configured nav items in the DB, respect that list
    // exactly. Only the default (unconfigured) menu ships the full set
    // including the gacha hub and Season Pass — admins manage those via
    // /admin/nav-items instead of having them force-injected here.
    const navLinks =
        dbNavItems.length > 0
            ? dbNavItems.map((item) => ({
                  href: normalizeNavHref(item.href),
                  label: item.label,
                  icon: navIconByName(item.icon),
              }))
            : [
                  PRIMARY_NAV.home,
                  PRIMARY_NAV.shop,
                  PRIMARY_NAV.gacha,
                  PRIMARY_NAV.seasonPass,
                  PRIMARY_NAV.dashboard,
                  PRIMARY_NAV.help,
              ].map((item) => ({
                  href: item.href,
                  label: item.label,
                  icon: navIconByHref(item.href),
              }));

    return (
        <MobileAutoHideHeader>
        <header id="main-navbar" className={`${themeClasses.header} w-full md:backdrop-blur-xl`}>
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4 lg:px-6 xl:px-8">
                <Link
                    href="/"
                    prefetch={false}
                    className="flex shrink-0 items-center gap-3.5 text-lg font-semibold text-primary xl:min-w-0"
                >
                    {siteSettings?.logoUrl ? (
                        <Image
                            src={siteSettings.logoUrl}
                            alt="Logo"
                            width={60}
                            height={60}
                            priority
                            className="h-12 w-12 object-contain sm:h-14 sm:w-14"
                        />
                    ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary sm:h-14 sm:w-14">
                            <Gamepad2 className="h-6 w-6 text-white sm:h-7 sm:w-7" />
                        </div>
                    )}
                    <span className="hidden whitespace-nowrap pr-1 font-bold leading-none tracking-tight text-foreground sm:inline sm:text-[1.15rem] lg:text-[1.22rem]">
                        {siteName}
                    </span>
                </Link>

                <nav className="hidden items-center justify-center gap-1 lg:flex xl:-translate-x-12">
                    {navLinks.map((link) => {
                        const Icon = link.icon;

                        if (link.href === "/shop") {
                            return <ShopDropdown key={link.href} categories={shopCategories} />;
                        }

                        return (
                            <NavLink key={link.href} href={link.href}>
                                <Icon className="h-4 w-4 flex-shrink-0" />
                                {link.label}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="flex shrink-0 items-center gap-1.5 lg:justify-self-end">
                    <NavbarSearch currencySettings={currencySettings} />
                    <ThemeToggle />
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
                        navLinks={navLinks.map(({ href, label }) => ({ href, label }))}
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
                        categories={shopCategories}
                        currencySettings={currencySettings}
                    />
                </div>
            </div>
        </header>
        </MobileAutoHideHeader>
    );
}
