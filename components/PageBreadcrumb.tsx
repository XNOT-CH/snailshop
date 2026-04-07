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
            <div className="overflow-x-auto">
                <Breadcrumb className="w-fit min-w-0">
                    <BreadcrumbList className="min-w-max flex-nowrap gap-1 px-1 py-1 text-sm sm:gap-1.5 sm:text-base">
                    {/* Home */}
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link
                                href="/"
                                className="flex items-center gap-1.5 rounded-full px-2 py-1 text-muted-foreground/90 hover:text-primary transition-colors duration-200"
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
                                        <BreadcrumbPage className="max-w-[200px] rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary sm:max-w-none">
                                            {item.label}
                                        </BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink asChild>
                                            <Link
                                                href={item.href}
                                                className="rounded-full px-2 py-1 text-muted-foreground/90 hover:text-primary transition-colors duration-200"
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
                    className="w-fit gap-1.5 rounded-full text-xs text-muted-foreground hover:bg-accent/50 hover:text-primary transition-colors duration-200 sm:text-sm"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    ย้อนกลับ
                </Button>
            )}
        </div>
    );
}
