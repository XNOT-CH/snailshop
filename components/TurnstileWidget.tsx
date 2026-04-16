"use client";

import { useEffect, useId, useRef, useState } from "react";
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
    const containerId = useId().replaceAll(":", "");
    const widgetIdRef = useRef<string | null>(null);
    const lastResetSignalRef = useRef(resetSignal);
    const [scriptReady, setScriptReady] = useState(
        () => typeof window !== "undefined" && Boolean(window.turnstile)
    );

    useEffect(() => {
        if (!siteKey || !scriptReady || !window.turnstile || widgetIdRef.current) return;

        widgetIdRef.current = window.turnstile.render(`#${containerId}`, {
            sitekey: siteKey,
            theme: "light",
            size: "flexible",
            callback: (token) => onTokenChange(token),
            "expired-callback": () => onTokenChange(null),
            "error-callback": () => onTokenChange(null),
        });

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
                widgetIdRef.current = null;
            }
        };
    }, [containerId, onTokenChange, scriptReady, siteKey]);

    useEffect(() => {
        if (!widgetIdRef.current || !window.turnstile) return;
        if (lastResetSignalRef.current === resetSignal) return;

        lastResetSignalRef.current = resetSignal;
        onTokenChange(null);
        window.turnstile.reset(widgetIdRef.current);
    }, [onTokenChange, resetSignal]);

    if (!siteKey) return null;

    return (
        <div className="space-y-2">
            <Script
                id="cloudflare-turnstile"
                src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                strategy="afterInteractive"
                onLoad={() => setScriptReady(true)}
            />
            <div className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                    ยืนยันว่าไม่ใช่บอท
                </p>
                <div id={containerId} className="min-h-16" />
            </div>
        </div>
    );
}
