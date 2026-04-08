"use client";

import dynamic from "next/dynamic";

type NavbarInteractiveProps = {
    user: { username: string; image?: string | null; creditBalance: number } | null;
    imageVersion?: string | number;
};

const NavbarUserMenu = dynamic(
    () => import("@/components/NavbarUserMenu").then((mod) => mod.NavbarUserMenu),
    { ssr: false }
);

const NavbarCartButton = dynamic(
    () => import("@/components/NavbarCartButton").then((mod) => mod.NavbarCartButton),
    { ssr: false }
);

export function NavbarInteractive({ user, imageVersion }: Readonly<NavbarInteractiveProps>) {
    return (
        <>
            <NavbarCartButton />
            {user ? (
                <NavbarUserMenu
                    username={user.username}
                    image={user.image}
                    imageVersion={imageVersion}
                    creditBalance={user.creditBalance}
                />
            ) : null}
        </>
    );
}
