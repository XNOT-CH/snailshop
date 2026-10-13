import Image from "next/image";
import { Dices, Gamepad2, ListChecks, ShoppingBag, Ticket } from "lucide-react";
import type { ReactNode } from "react";

interface AuthFormShellProps {
    readonly logoUrl: string | null;
    readonly title: string;
    readonly subtitle: string;
    readonly children: ReactNode;
}

// What the shop actually offers; the reference layout's trust claims
// (100%, 24 hours) are left out because nothing here backs them.
const FEATURES = [
    { icon: ShoppingBag, label: "ร้านค้า" },
    { icon: Dices, label: "ตู้กาชา" },
    { icon: ListChecks, label: "ภารกิจรายวัน" },
    { icon: Ticket, label: "Season Pass" },
];

// The sign-in family of pages on one near-black band, the hero's colour, lit
// by soft glows and streaks in the site's primary blue. Wide screens add a
// welcome column beside the form card; phones get the card alone. The band is
// painted past the content column with a spread shadow clipped to its own
// height, as the home bands are, which also covers the site background image.
export function AuthFormShell({ logoUrl, title, subtitle, children }: AuthFormShellProps) {
    return (
        <div className="relative isolate flex min-h-[calc(100dvh-4rem)] items-center bg-[var(--hero-band)] py-10 shadow-[0_0_0_100vmax_var(--hero-band)] [--hero-band:#0a0e14] [clip-path:inset(0_-100vmax)] sm:py-16">
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-hidden">
                <div className="absolute -left-40 top-0 size-[36rem] rounded-full bg-primary/20 blur-[120px]" />
                <div className="absolute -right-40 bottom-0 size-[32rem] rounded-full bg-primary/15 blur-[120px]" />
                <div className="absolute -right-24 top-1/4 h-px w-[40rem] -rotate-[35deg] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                <div className="absolute -left-24 bottom-1/4 h-px w-[32rem] -rotate-[35deg] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            </div>

            <div className="mx-auto grid w-full max-w-6xl items-center gap-16 lg:grid-cols-[1fr_minmax(0,28rem)]">
                <div className="hidden text-white lg:block motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-4 motion-safe:duration-700 motion-safe:fill-mode-both">
                    <h2 className="text-4xl font-bold leading-tight">
                        ไอดีเกม ไอเทม และกาชา
                        <span className="block text-primary">ครบในที่เดียว</span>
                    </h2>
                    <p className="mt-5 max-w-md text-base text-white/70">
                        เลือกซื้อไอดีเกมและไอเทม สุ่มตู้กาชา ทำภารกิจรายวัน และสะสมรางวัลจาก Season Pass ได้ในบัญชีเดียว
                    </p>
                    <ul className="mt-10 flex gap-10">
                        {FEATURES.map(({ icon: Icon, label }) => (
                            <li key={label} className="flex flex-col items-center gap-2 text-sm font-medium text-white/90">
                                <Icon className="size-7 text-primary" strokeWidth={1.75} />
                                {label}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="w-full motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:fill-mode-both">
                    <div className="rounded-2xl bg-card p-5 shadow-[0_24px_64px_-16px] shadow-primary/30 ring-1 ring-primary/25 sm:p-8">
                        <div className="mb-7 text-center">
                            {logoUrl ? (
                                <Image src={logoUrl} alt="" width={160} height={64} className="mx-auto h-14 w-auto max-w-[160px] object-contain" priority />
                            ) : (
                                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary">
                                    <Gamepad2 className="h-7 w-7 text-white" />
                                </span>
                            )}
                            <h1 className="mt-4 text-2xl font-bold text-foreground">{title}</h1>
                            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
                        </div>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
