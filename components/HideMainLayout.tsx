"use client";

import { useEffect } from "react";

/**
 * When mounted, adds `admin-layout` class to <body>.
 * CSS rules in globals.css will:
 *   - hide Navbar & Footer
 *   - remove max-w-7xl container constraint
 * The class is removed on unmount (route change away from admin/dashboard).
 */
export function HideMainLayout() {
    useEffect(() => {
        document.body.classList.add("admin-layout");
        return () => {
            document.body.classList.remove("admin-layout");
        };
    }, []);

    return null;
}
