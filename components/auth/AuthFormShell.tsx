import Image from "next/image";
import { Gamepad2 } from "lucide-react";
import type { ReactNode } from "react";

interface AuthFormShellProps {
    readonly logoUrl: string | null;
    readonly title: string;
    readonly subtitle: string;
    readonly children: ReactNode;
}

// The sign-in family of pages in the home page's language: a near-black band
// like the hero carries the logo and title, and the form card rises over its
// lower edge onto a plain band. Both bands are painted past the content column
// with a spread shadow clipped to their own height, as the home bands are, and
// together they cover the site background image.
export function AuthFormShell({ logoUrl, title, subtitle, children }: AuthFormShellProps) {
    return (
        <div
            className="min-h-[calc(100dvh-4rem)] pb-16 sm:pb-24"
            style={{ backgroundColor: "var(--background)", boxShadow: "0 0 0 100vmax var(--background)", clipPath: "inset(0 -100vmax)" }}
        >
            <div className="relative isolate bg-[var(--hero-band)] px-4 pb-28 pt-10 text-center shadow-[0_0_0_100vmax_var(--hero-band)] [--hero-band:#151515] [clip-path:inset(0_-100vmax)] sm:pb-32 sm:pt-14">
                {logoUrl ? (
                    <Image src={logoUrl} alt="" width={160} height={64} className="mx-auto h-16 w-auto max-w-[160px] object-contain" priority />
                ) : (
                    <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary">
                        <Gamepad2 className="h-8 w-8 text-white" />
                    </span>
                )}
                <h1 className="mt-4 text-2xl font-bold text-white sm:text-3xl">{title}</h1>
                <p className="mx-auto mt-2 max-w-sm text-sm text-white/70">{subtitle}</p>
            </div>

            <div className="relative mx-auto -mt-20 w-full max-w-md px-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:fill-mode-both">
                <div className="rounded-2xl bg-card p-5 shadow-xl shadow-black/10 sm:p-8">{children}</div>
            </div>
        </div>
    );
}
