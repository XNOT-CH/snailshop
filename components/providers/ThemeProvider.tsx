"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: Readonly<ThemeProviderProps>) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <NextThemesProvider
            attribute="class"
            themes={["light", "dark"]}
            defaultTheme="light"
            enableSystem={false}
            enableColorScheme
            storageKey="snailshop-theme"
            disableTransitionOnChange
            forcedTheme={mounted ? undefined : "light"}
            {...props}
        >
            {children}
        </NextThemesProvider>
    );
}
