"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: Readonly<ThemeProviderProps>) {
    return (
        <NextThemesProvider
            attribute="class"
            themes={["light", "dark"]}
            defaultTheme="dark"
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
