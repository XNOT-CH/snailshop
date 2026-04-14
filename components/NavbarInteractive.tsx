"use client";

import dynamic from "next/dynamic";
import type { PublicCurrencySettings } from "@/lib/currencySettings";

type NavbarInteractiveProps = {
    user: { username: string; image?: string | null; creditBalance: number; pointBalance: number } | null;
    imageVersion?: string | number;
    currencySettings?: PublicCurrencySettings;
};

const NavbarUserMenu = dynamic(
    () => import("@/components/NavbarUserMenu").then((mod) => mod.NavbarUserMenu),
    { ssr: false }
);

const NavbarCartButton = dynamic(
    () => import("@/components/NavbarCartButton").then((mod) => mod.NavbarCartButton),
    { ssr: false }
);

export function NavbarInteractive({ user, imageVersion, currencySettings }: Readonly<NavbarInteractiveProps>) {
    return (
        <>
            <NavbarCartButton />
            {user ? (
                <NavbarUserMenu
                    username={user.username}
                    image={user.image}
                    imageVersion={imageVersion}
                    creditBalance={user.creditBalance}
                    pointBalance={user.pointBalance}
                    currencySettings={currencySettings}
                />
            ) : null}
        </>
    );
}
