"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "next-themes";
import Script from "next/script";

declare global {
    interface Window {
        turnstile?: {
            render: (
                container: string | HTMLElement,
                options: {
                    sitekey: string;
                    theme?: "light" | "dark" | "auto";
                    size?: "normal" | "compact" | "flexible";
                    callback?: (token: string) => void;
                    "expired-callback"?: () => void;
                    "error-callback"?: () => void;
                }
            ) => string;
            reset: (widgetId?: string) => void;
            remove: (widgetId?: string) => void;
        };
    }
}

interface TurnstileWidgetProps {
    readonly onTokenChange: (token: string | null) => void;
    readonly resetSignal?: number;
}

export function TurnstileWidget({
    onTokenChange,
    resetSignal = 0,
}: Readonly<TurnstileWidgetProps>) {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    // Match the widget chrome to the app theme (class-based, not OS): "auto"
    // would follow prefers-color-scheme and mismatch our toggle, so resolve it
    // ourselves and re-render the widget when the user flips the theme.
    const { resolvedTheme } = useTheme();
    const widgetTheme = resolvedTheme === "dark" ? "dark" : "light";
    const containerId = useId().replaceAll(":", "");
    const widgetIdRef = useRef<string | null>(null);
    const lastResetSignalRef = useRef(resetSignal);
    const [scriptReady, setScriptReady] = useState(
        () => typeof globalThis.window !== "undefined" && Boolean(globalThis.window.turnstile)
    );

    useEffect(() => {
        if (!siteKey || !scriptReady || !globalThis.window?.turnstile || widgetIdRef.current) return;

        widgetIdRef.current = globalThis.window.turnstile.render(`#${containerId}`, {
            sitekey: siteKey,
            theme: widgetTheme,
            size: "flexible",
            callback: (token) => onTokenChange(token),
            "expired-callback": () => onTokenChange(null),
            "error-callback": () => onTokenChange(null),
        });

        return () => {
            if (widgetIdRef.current && globalThis.window?.turnstile) {
                globalThis.window.turnstile.remove(widgetIdRef.current);
                widgetIdRef.current = null;
            }
        };
    }, [containerId, onTokenChange, scriptReady, siteKey, widgetTheme]);

    useEffect(() => {
        if (!widgetIdRef.current || !globalThis.window?.turnstile) return;
        if (lastResetSignalRef.current === resetSignal) return;

        lastResetSignalRef.current = resetSignal;
        onTokenChange(null);
        globalThis.window.turnstile.reset(widgetIdRef.current);
    }, [onTokenChange, resetSignal]);

    if (!siteKey) return null;

    return (
        <>
            <Script
                id="cloudflare-turnstile"
                src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                strategy="afterInteractive"
                onLoad={() => setScriptReady(true)}
            />
            <div id={containerId} className="min-h-16 w-full max-w-full overflow-hidden" />
        </>
    );
}
