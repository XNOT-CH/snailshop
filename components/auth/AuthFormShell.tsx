import Image from "next/image";
import { Gamepad2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthFormShellProps {
    readonly logoUrl: string | null;
    readonly title: string;
    readonly subtitle: string;
    readonly children: ReactNode;
    readonly fullHeight?: boolean;
    readonly variant?: "default" | "separated";
}

export function AuthFormShell({
    logoUrl,
    title,
    subtitle,
    children,
    fullHeight = true,
    variant = "default",
}: AuthFormShellProps) {
    const isSeparated = variant === "separated";

    return (
        <div
            className={cn(
                "flex items-center justify-center px-4 py-12",
                fullHeight && "min-h-screen",
                isSeparated && "-mx-3 min-h-[calc(100dvh-5rem)] bg-[#f4f6f8] px-3 py-8 sm:-mx-4 sm:px-6 lg:-mx-6 xl:-mx-8 dark:bg-[#0b1420]"
            )}
        >
            <div className={cn("w-full max-w-md", isSeparated && "max-w-[720px]")}>
                <div
                    className={cn(
                        "bg-card rounded-2xl shadow-xl shadow-primary/10 p-8",
                        isSeparated && "relative overflow-hidden rounded-[6px] border border-[#d9dee5] bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.12)] sm:p-6 dark:border-[#26384f] dark:bg-[#101a2b]"
                    )}
                >
                    <div
                        className={cn(
                            "flex items-start justify-between mb-8",
                            isSeparated && "mb-6 flex-col items-center justify-center gap-3 text-center"
                        )}
                    >
                        <div className={cn(isSeparated && "order-2")}>
                            <h1 className={cn("text-2xl font-bold text-primary", isSeparated && "text-xl")}>{title}</h1>
                            <p className="text-muted-foreground text-sm">{subtitle}</p>
                        </div>
                        {logoUrl ? (
                            <Image
                                src={logoUrl}
                                alt="Logo"
                                width={64}
                                height={64}
                                className={cn(
                                    "h-16 w-16 rounded-xl object-contain",
                                    isSeparated && "order-1 h-20 w-auto max-w-[180px] rounded-none"
                                )}
                                priority
                            />
                        ) : (
                            <div className={cn("h-16 w-16 rounded-xl bg-primary flex items-center justify-center", isSeparated && "order-1")}>
                                <Gamepad2 className="h-8 w-8 text-white" />
                            </div>
                        )}
                    </div>

                    {children}
                    {isSeparated ? <div className="absolute inset-x-0 bottom-0 h-[3px] bg-[#2f7df6]" aria-hidden="true" /> : null}
                </div>
            </div>
        </div>
    );
}
