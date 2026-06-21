"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribeToToasts, type ToastKind, type ToastPayload } from "@/lib/toast";

const MAX_VISIBLE_TOASTS = 3;

const toastStyles: Record<
    ToastKind,
    {
        icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
        iconClassName: string;
        barClassName: string;
    }
> = {
    success: {
        icon: CheckCircle2,
        iconClassName: "text-emerald-500",
        barClassName: "bg-emerald-500",
    },
    error: {
        icon: XCircle,
        iconClassName: "text-rose-500",
        barClassName: "bg-rose-500",
    },
    warning: {
        icon: AlertTriangle,
        iconClassName: "text-amber-500",
        barClassName: "bg-amber-500",
    },
    info: {
        icon: Info,
        iconClassName: "text-sky-500",
        barClassName: "bg-sky-500",
    },
};

export function ToastProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [toasts, setToasts] = React.useState<ToastPayload[]>([]);
    const removeToast = React.useCallback((id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    React.useEffect(() => {
        return subscribeToToasts((toast) => {
            setToasts((current) => [...current, toast].slice(-MAX_VISIBLE_TOASTS));
        });
    }, []);

    React.useEffect(() => {
        const timers = toasts.map((toast) =>
            window.setTimeout(() => removeToast(toast.id), toast.duration),
        );

        return () => {
            timers.forEach(window.clearTimeout);
        };
    }, [removeToast, toasts]);

    return (
        <>
            {children}
            <div
                aria-live="polite"
                aria-relevant="additions text"
                className="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-[120] flex flex-col-reverse gap-2 sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-4 sm:w-[min(24rem,calc(100vw-2rem))] sm:flex-col"
            >
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
                ))}
            </div>
        </>
    );
}

function ToastItem({
    toast,
    onClose,
}: Readonly<{
    toast: ToastPayload;
    onClose: () => void;
}>) {
    const style = toastStyles[toast.kind];
    const Icon = style.icon;

    return (
        <div
            role="status"
            className="pointer-events-auto overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 text-slate-900 shadow-lg shadow-slate-900/12 backdrop-blur-md animate-in fade-in-0 slide-in-from-bottom-2 sm:slide-in-from-top-2 dark:border-slate-700/80 dark:bg-slate-900/95 dark:text-slate-50"
        >
            <div className="flex min-h-14 items-start gap-3 px-3.5 py-3">
                <Icon className={cn("mt-0.5 size-5 shrink-0", style.iconClassName)} aria-hidden="true" />
                <p className="min-w-0 flex-1 text-sm font-medium leading-5 break-words">
                    {toast.title}
                </p>
                <button
                    type="button"
                    aria-label="ปิดการแจ้งเตือน"
                    onClick={onClose}
                    className="grid size-7 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            </div>
            <div className="h-1 bg-slate-100 dark:bg-slate-800">
                <div
                    className={cn("h-full origin-left animate-[toast-progress_linear_forwards]", style.barClassName)}
                    style={{ animationDuration: `${toast.duration}ms` }}
                />
            </div>
        </div>
    );
}
