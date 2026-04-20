"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * When mounted, adds `admin-layout` class to <body>.
 * CSS rules in globals.css will:
 *   - hide Navbar & Footer
 *   - remove max-w-7xl container constraint
 * The class is removed on unmount (route change away from admin/dashboard).
 */
export function HideMainLayout() {
    const pathname = usePathname();

    useEffect(() => {
        const layoutClass = pathname.startsWith("/admin") ? "admin-layout" : "dashboard-layout";

        document.body.classList.add(layoutClass);
        return () => {
            document.body.classList.remove(layoutClass);
        };
    }, [pathname]);

    return null;
}
