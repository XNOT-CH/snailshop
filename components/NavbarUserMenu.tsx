"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Settings, User, UserCog, Wallet } from "lucide-react";
import { LogoutMenuItem } from "@/components/LogoutMenuItem";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
    creditBalance: number;
}

function UserAvatarButton({
    username,
    disabled = false,
}: Readonly<{ username: string; disabled?: boolean }>) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            disabled={disabled}
            aria-label="\u0E40\u0E21\u0E19\u0E39\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49"
        >
            <Avatar className="h-9 w-9 border-2 border-primary">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {username.charAt(0).toUpperCase()}
                </AvatarFallback>
            </Avatar>
        </Button>
    );
}

export function NavbarUserMenu({
    username,
    creditBalance,
}: Readonly<NavbarUserMenuProps>) {
    const mounted = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );

    if (!mounted) {
        return <UserAvatarButton username={username} disabled />;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <UserAvatarButton username={username} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl bg-card">
                <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium text-foreground">{username}</p>
                        <p className="text-xs text-muted-foreground">
                            {"\u0E3F"}{creditBalance.toLocaleString()}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex cursor-pointer items-center gap-2 text-foreground">
                        <User className="h-4 w-4" />
                        {"\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14"}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/profile/settings" className="flex cursor-pointer items-center gap-2 text-foreground">
                        <UserCog className="h-4 w-4" />
                        {"\u0E41\u0E01\u0E49\u0E44\u0E02\u0E42\u0E1B\u0E23\u0E44\u0E1F\u0E25\u0E4C"}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/topup" className="flex cursor-pointer items-center gap-2 text-foreground">
                        <Wallet className="h-4 w-4" />
                        {"\u0E40\u0E15\u0E34\u0E21\u0E40\u0E07\u0E34\u0E19"}
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
