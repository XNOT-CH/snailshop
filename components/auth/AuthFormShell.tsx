import Image from "next/image";
import { Gamepad2 } from "lucide-react";
import type { ReactNode } from "react";

interface AuthFormShellProps {
    readonly logoUrl: string | null;
    readonly title: string;
    readonly subtitle: string;
    readonly children: ReactNode;
}

export function AuthFormShell({
    logoUrl,
    title,
    subtitle,
    children,
}: AuthFormShellProps) {
    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="bg-card rounded-2xl shadow-xl shadow-primary/10 p-8">
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-primary">{title}</h1>
                            <p className="text-muted-foreground text-sm">{subtitle}</p>
                        </div>
                        {logoUrl ? (
                            <Image
                                src={logoUrl}
                                alt="Logo"
                                width={64}
                                height={64}
                                className="h-16 w-16 rounded-xl object-contain"
                                priority
                            />
                        ) : (
                            <div className="h-16 w-16 rounded-xl bg-primary flex items-center justify-center">
                                <Gamepad2 className="h-8 w-8 text-white" />
                            </div>
                        )}
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
}
