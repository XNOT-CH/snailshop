"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isNavActive } from "@/lib/navigation";

interface NavLinkProps {
    readonly href: string;
    readonly children: React.ReactNode;
}

export function NavLink({ href, children }: Readonly<NavLinkProps>) {
    const pathname = usePathname();
    const isActive = isNavActive(href, pathname);

    return (
        <Link
            href={href}
            prefetch={false}
            className={cn(
                "relative flex whitespace-nowrap items-center gap-1 px-2.5 py-2 text-sm font-medium transition-colors duration-200",
                // Active = underline, not a filled pill, so the register button
                // stays the only solid-blue element in the bar.
                "after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:transition-opacity",
                isActive
                    ? "text-foreground after:opacity-100"
                    : "text-muted-foreground after:opacity-0 hover:text-foreground"
            )}
        >
            {children}
        </Link>
    );
}
