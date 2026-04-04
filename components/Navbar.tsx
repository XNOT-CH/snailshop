import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { db, users, navItems } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { Button } from "@/components/ui/button";
import { NavbarUserMenu } from "@/components/NavbarUserMenu";
import { ShopDropdown } from "@/components/ShopDropdown";
import { NavigationDrawer } from "@/components/NavigationDrawer";
import {
    Dices,
    Gamepad2,
    HelpCircle,
    Home,
    LayoutDashboard,
    Settings,
    ShoppingBag,
    User,
    Wallet,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavbarCartButton } from "@/components/NavbarCartButton";

export default async function Navbar() {
    const session = await auth();
    const userId = session?.user?.id;
    const avatarVersion = Date.now();

    const [user, siteSettings, dbNavItems, allProducts] = await Promise.all([
        userId
            ? db.query.users.findFirst({
                  where: eq(users.id, userId),
                  columns: { username: true, image: true, creditBalance: true },
              })
            : Promise.resolve(null),
        getSiteSettings(),
        db.query.navItems.findMany({
            where: eq(navItems.isActive, true),
            orderBy: (table, { asc }) => asc(table.sortOrder),
        }),
        db.query.products.findMany({
            columns: { category: true },
            where: (table, { eq: equals }) => equals(table.isSold, false),
        }),
    ]);

    const shopCategories = [...new Set(allProducts.map((product) => product.category))]
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right));

    const iconMap: Record<string, typeof Home> = {
        home: Home,
        shop: ShoppingBag,
        dashboard: LayoutDashboard,
        help: HelpCircle,
        wallet: Wallet,
        user: User,
        settings: Settings,
        dices: Dices,
        gacha: Dices,
    };

    const baseNavLinks =
        dbNavItems.length > 0
            ? dbNavItems.map((item) => ({
                  href: item.href,
                  label: item.label,
                  icon: iconMap[item.icon?.toLowerCase() ?? ""] ?? Home,
              }))
            : [
                  { href: "/", label: "หน้าแรก", icon: Home },
                  { href: "/shop", label: "ร้านค้า", icon: ShoppingBag },
                  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
                  { href: "/help", label: "ช่วยเหลือ", icon: HelpCircle },
              ];

    const hasGachapons = baseNavLinks.some((link) => link.href === "/gachapons");
    const navLinks = hasGachapons
        ? baseNavLinks
        : (() => {
              const shopIndex = baseNavLinks.findIndex((link) => link.href === "/shop");
              const hubItem = {
                  href: "/gachapons",
                  label: "หมวดหมู่กาชา",
                  icon: Dices,
              };
              const nextLinks = [...baseNavLinks];

              if (shopIndex >= 0) {
                  nextLinks.splice(shopIndex + 1, 0, hubItem);
                  return nextLinks;
              }

              return [...nextLinks, hubItem];
          })();

    return (
        <header id="main-navbar" className="sticky top-0 z-50 w-full border-b border-white/6 bg-background/78 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-4 lg:px-6 xl:grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:gap-4 xl:px-8">
                <Link href="/" className="flex min-w-0 items-center gap-2.5 text-lg font-semibold text-primary xl:min-w-0">
                    {siteSettings?.logoUrl ? (
                        <Image
                            src={siteSettings.logoUrl}
                            alt="Logo"
                            width={36}
                            height={36}
                            priority
                            className="h-9 w-9 rounded-lg object-contain"
                        />
                    ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                            <Gamepad2 className="h-5 w-5 text-white" />
                        </div>
                    )}
                    <span className="hidden truncate font-bold tracking-tight text-foreground sm:inline">
                        {siteSettings?.heroTitle || "GameStore"}
                    </span>
                </Link>

                <nav className="hidden items-center justify-center gap-1 rounded-full border border-white/8 bg-white/[0.03] px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] xl:flex">
                    {navLinks.map((link) => {
                        const Icon = link.icon;

                        if (link.href === "/shop") {
                            return <ShopDropdown key={link.href} categories={shopCategories} />;
                        }

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="flex whitespace-nowrap items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-white/[0.06] hover:text-foreground"
                            >
                                <Icon className="h-4 w-4 flex-shrink-0" />
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex shrink-0 items-center gap-1.5 xl:justify-self-end">
                    <ThemeToggle />
                    <NavbarCartButton />

                    {user ? (
                        <>
                            <Link href="/dashboard/topup" className="hidden lg:block">
                                <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl font-medium text-muted-foreground hover:bg-accent hover:text-primary">
                                    <Wallet className="h-4 w-4 shrink-0 text-primary" />
                                    <span className="font-semibold text-foreground">
                                        ฿{Number(user.creditBalance).toLocaleString()}
                                    </span>
                                </Button>
                            </Link>

                            <NavbarUserMenu
                                username={user.username}
                                image={user.image}
                                imageVersion={avatarVersion}
                                creditBalance={Number(user.creditBalance)}
                            />
                        </>
                    ) : (
                        <div className="hidden items-center gap-2 lg:flex">
                            <Link href="/login">
                                <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground hover:bg-accent hover:text-primary">
                                    เข้าสู่ระบบ
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button size="sm" className="rounded-xl">
                                    สมัครสมาชิก
                                </Button>
                            </Link>
                        </div>
                    )}

                    <NavigationDrawer
                        navLinks={navLinks.map(({ href, label }) => ({ href, label }))}
                        user={user ? { username: user.username, image: user.image, creditBalance: Number(user.creditBalance) } : null}
                        imageVersion={avatarVersion}
                        siteName={siteSettings?.heroTitle || "GameStore"}
                        logoUrl={siteSettings?.logoUrl || undefined}
                        categories={shopCategories}
                    />
                </div>
            </div>
        </header>
    );
}
