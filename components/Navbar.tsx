import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/getSiteSettings";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoutButton } from "@/components/LogoutButton";
import {
    Menu,
    Gamepad2,
    Home,
    ShoppingBag,
    LayoutDashboard,
    Wallet,
    User,
    UserCog,
    Settings,
    HelpCircle,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function Navbar() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    // Parallel fetch for better performance
    const [user, siteSettings] = await Promise.all([
        userId ? db.user.findUnique({
            where: { id: userId },
            select: { username: true, creditBalance: true },
        }) : Promise.resolve(null),
        getSiteSettings(),
    ]);

    const navLinks = [
        { href: "/", label: "หน้าแรก", icon: Home },
        { href: "/shop", label: "ร้านค้า", icon: ShoppingBag },
        { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
        { href: "/help", label: "ช่วยเหลือ", icon: HelpCircle },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/90 backdrop-blur-lg shadow-sm">
            <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 font-semibold text-lg text-primary">
                    {siteSettings?.logoUrl ? (
                        <img
                            src={siteSettings.logoUrl}
                            alt="Logo"
                            width={48}
                            height={48}
                            className="rounded-xl object-contain h-12 w-12"
                        />
                    ) : (
                        <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
                            <Gamepad2 className="h-6 w-6 text-white" />
                        </div>
                    )}
                    <span className="hidden sm:inline">{siteSettings?.heroTitle || "GameStore"}</span>
                </Link>

                {/* Navigation - Desktop */}
                <nav className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary rounded-xl hover:bg-accent"
                            >
                                <Icon className="h-4 w-4" />
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Right Side */}
                <div className="flex items-center gap-2">
                    {/* Theme Toggle */}
                    <ThemeToggle />
                    {user ? (
                        <>
                            {/* Credit Balance */}
                            <Link href="/dashboard/topup" className="hidden sm:block">
                                <Button variant="outline" size="sm" className="gap-2 rounded-xl border-border bg-accent text-primary hover:bg-accent/80">
                                    <Wallet className="h-4 w-4" />
                                    ฿{Number(user.creditBalance).toLocaleString()}
                                </Button>
                            </Link>

                            {/* User Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full">
                                        <Avatar className="h-9 w-9 border-2 border-primary">
                                            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                                                {user.username.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 rounded-xl bg-card">
                                    <DropdownMenuLabel>
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium text-foreground">{user.username}</p>
                                            <p className="text-xs text-muted-foreground">
                                                ฿{Number(user.creditBalance).toLocaleString()}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer text-foreground">
                                            <User className="h-4 w-4" />
                                            แดชบอร์ด
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/profile/settings" className="flex items-center gap-2 cursor-pointer text-foreground">
                                            <UserCog className="h-4 w-4" />
                                            แก้ไขโปรไฟล์
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard/topup" className="flex items-center gap-2 cursor-pointer text-foreground">
                                            <Wallet className="h-4 w-4" />
                                            เติมเงิน
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer text-foreground">
                                            <Settings className="h-4 w-4" />
                                            ตั้งค่า
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                                        <LogoutButton />
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <div className="hidden sm:flex items-center gap-2">
                            <Link href="/login">
                                <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground hover:text-primary hover:bg-accent">
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

                    {/* Mobile Menu */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden rounded-xl text-muted-foreground hover:text-primary hover:bg-accent">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-80 bg-card border-l border-border">
                            <SheetHeader>
                                <SheetTitle className="flex items-center gap-2 text-primary">
                                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                                        <Gamepad2 className="h-4 w-4 text-white" />
                                    </div>
                                    {siteSettings?.heroTitle || "GameStore"}
                                </SheetTitle>
                            </SheetHeader>
                            <div className="flex flex-col gap-4 mt-6">
                                {/* User Info (Mobile) */}
                                {user && (
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-accent">
                                        <Avatar>
                                            <AvatarFallback className="bg-primary text-primary-foreground">
                                                {user.username.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-foreground">{user.username}</p>
                                            <p className="text-sm text-muted-foreground">
                                                ฿{Number(user.creditBalance).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Nav Links (Mobile) */}
                                <nav className="flex flex-col gap-1">
                                    {navLinks.map((link) => {
                                        const Icon = link.icon;
                                        return (
                                            <Link
                                                key={link.href}
                                                href={link.href}
                                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
                                            >
                                                <Icon className="h-5 w-5" />
                                                {link.label}
                                            </Link>
                                        );
                                    })}
                                    {user && (
                                        <Link
                                            href="/dashboard/topup"
                                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
                                        >
                                            <Wallet className="h-5 w-5" />
                                            เติมเงิน
                                        </Link>
                                    )}
                                </nav>

                                {/* Auth Buttons (Mobile) */}
                                {!user && (
                                    <div className="flex flex-col gap-2 pt-4 border-t border-border">
                                        <Link href="/login">
                                            <Button variant="outline" className="w-full rounded-xl border-border text-muted-foreground hover:bg-accent">
                                                เข้าสู่ระบบ
                                            </Button>
                                        </Link>
                                        <Link href="/register">
                                            <Button className="w-full rounded-xl">
                                                สมัครสมาชิก
                                            </Button>
                                        </Link>
                                    </div>
                                )}

                                {/* Logout (Mobile) */}
                                {user && (
                                    <div className="pt-4 border-t border-border">
                                        <LogoutButton />
                                    </div>
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
