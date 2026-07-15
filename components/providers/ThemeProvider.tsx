"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: Readonly<ThemeProviderProps>) {
    // No forcedTheme here: next-themes' inline script applies the stored theme
    // class before first paint (html has suppressHydrationWarning). Forcing
    // "light" until mount made dark-mode users load in light and flip ~1s
    // later, freezing `transition-colors` mid-blend (khaki/green borders on
    // amber-tinted cards) while the main thread was busy hydrating.
    return (
        <NextThemesProvider
            attribute="class"
            themes={["light", "dark"]}
            defaultTheme="light"
            enableSystem={false}
            enableColorScheme
            storageKey="snailshop-theme"
            disableTransitionOnChange
            {...props}
        >
            {children}
        </NextThemesProvider>
    );
}
