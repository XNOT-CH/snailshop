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
                "flex whitespace-nowrap items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-primary hover:text-primary-foreground"
            )}
        >
            {children}
        </Link>
    );
}
