"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ChevronRight, ArrowLeft } from "lucide-react";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { themeClasses } from "@/lib/theme";

export interface BreadcrumbItemData {
    label: string;
    href?: string;
}

interface PageBreadcrumbProps {
    items: BreadcrumbItemData[];
    className?: string;
    showBackButton?: boolean;
}

export function PageBreadcrumb({ items, className, showBackButton = true }: Readonly<PageBreadcrumbProps>) {
    const router = useRouter();

    return (
        <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}>
            <div className="hidden min-w-0 md:block">
                <Breadcrumb className="w-full min-w-0">
                    <BreadcrumbList className={cn(themeClasses.navPill, "inline-flex w-fit min-w-0 flex-wrap gap-1 rounded-full px-2 py-1.5 text-sm sm:gap-1.5 sm:text-base")}>
                    {/* Home */}
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link
                                href="/"
                                className="flex items-center gap-1.5 rounded-full px-2 py-1 text-muted-foreground/90 transition-colors duration-200 hover:bg-accent/60 hover:text-primary dark:hover:bg-white/5 dark:hover:text-sky-100"
                            >
                                <Home className="h-3.5 w-3.5" />
                                <span>หน้าแรก</span>
                            </Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>

                    {/* Dynamic items */}
                    {items.map((item, index) => {
                        const isLast = index === items.length - 1;
                        return (
                            <span key={item.label + "-" + index} className="contents">
                                <BreadcrumbSeparator>
                                    <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                                </BreadcrumbSeparator>
                                <BreadcrumbItem>
                                    {isLast || !item.href ? (
                                        <BreadcrumbPage className="max-w-full break-words rounded-full border border-primary/20 bg-primary/12 px-2.5 py-1 font-semibold text-primary shadow-[0_8px_20px_-16px_rgba(88,166,255,0.75)] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100 dark:shadow-[0_10px_22px_-18px_rgba(0,0,0,0.7)]">
                                            {item.label}
                                        </BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink asChild>
                                            <Link
                                                href={item.href}
                                                className="break-words rounded-full px-2 py-1 text-muted-foreground/90 transition-colors duration-200 hover:bg-accent/60 hover:text-primary dark:hover:bg-white/5 dark:hover:text-sky-100"
                                            >
                                                {item.label}
                                            </Link>
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                            </span>
                        );
                    })}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {showBackButton && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className={cn(themeClasses.actionMuted, "w-fit gap-1.5 rounded-full text-xs text-muted-foreground transition-colors duration-200 hover:text-primary sm:text-sm")}
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    ย้อนกลับ
                </Button>
            )}
        </div>
    );
}
