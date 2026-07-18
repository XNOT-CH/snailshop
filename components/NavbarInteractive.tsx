"use client";

import dynamic from "next/dynamic";
import type { PublicCurrencySettings } from "@/lib/currencySettings";

type NavbarInteractiveProps = {
    user: { name?: string | null; username: string; image?: string | null; creditBalance: number; pointBalance: number } | null;
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
            {user ? <NavbarCartButton /> : null}
            {user ? (
                // On mobile the account entry points are the bottom-nav tab and
                // the navigation drawer, so the avatar menu is desktop-only.
                <div className="hidden lg:block">
                    <NavbarUserMenu
                        displayName={user.name}
                        username={user.username}
                        image={user.image}
                        imageVersion={imageVersion}
                        creditBalance={user.creditBalance}
                        pointBalance={user.pointBalance}
                        currencySettings={currencySettings}
                    />
                </div>
            ) : null}
        </>
    );
}
