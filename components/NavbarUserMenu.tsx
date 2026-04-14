"use client";

import * as React from "react";
import Link from "next/link";
import { CreditCard, Package, Settings, Wallet } from "lucide-react";
import { LogoutMenuItem } from "@/components/LogoutMenuItem";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { withImageVersion } from "@/lib/imageUrl";
import { formatCurrencyAmount, type PublicCurrencySettings } from "@/lib/currencySettings";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarUserMenuProps {
    username: string;
    image?: string | null;
    imageVersion?: string | number;
    creditBalance: number;
    pointBalance: number;
    currencySettings?: PublicCurrencySettings;
}

const UserAvatarButton = React.forwardRef<
    React.ElementRef<typeof Button>,
    Readonly<{
        username: string;
        image?: string | null;
        imageVersion?: string | number;
        disabled?: boolean;
    }> &
        React.ComponentPropsWithoutRef<typeof Button>
>(function UserAvatarButton(
    {
        username,
        image,
        imageVersion,
        disabled = false,
        ...props
    },
    ref
) {
    return (
        <Button
            ref={ref}
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            disabled={disabled}
            aria-label="\u0E40\u0E21\u0E19\u0E39\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49"
            {...props}
        >
            <Avatar className="h-9 w-9 border-2 border-primary">
                <AvatarImage src={withImageVersion(image, imageVersion)} alt={username} className="object-cover" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {username.charAt(0).toUpperCase()}
                </AvatarFallback>
            </Avatar>
        </Button>
    );
});

export function NavbarUserMenu({
    username,
    image,
    imageVersion,
    creditBalance,
    pointBalance,
    currencySettings,
}: Readonly<NavbarUserMenuProps>) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <UserAvatarButton username={username} image={image} imageVersion={imageVersion} disabled />;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <UserAvatarButton username={username} image={image} imageVersion={imageVersion} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl bg-card">
                <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium text-foreground">{username}</p>
                        <p className="text-xs text-muted-foreground">
                            {"\u0E3F"}{creditBalance.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {formatCurrencyAmount(pointBalance, "POINT", currencySettings)}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/topup" className="flex cursor-pointer items-center gap-2 text-foreground">
                        <CreditCard className="h-4 w-4" />
                        {"\u0E40\u0E15\u0E34\u0E21\u0E40\u0E07\u0E34\u0E19"}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/inventory" className="flex cursor-pointer items-center gap-2 text-foreground">
                        <Package className="h-4 w-4" />
                        {"\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E09\u0E31\u0E19"}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/wallet" className="flex cursor-pointer items-center gap-2 text-foreground">
                        <Wallet className="h-4 w-4" />
                        {"\u0E01\u0E23\u0E30\u0E40\u0E1B\u0E4B\u0E32"}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" className="flex cursor-pointer items-center gap-2 text-foreground">
                        <Settings className="h-4 w-4" />
                        {"\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32"}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <LogoutMenuItem />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
