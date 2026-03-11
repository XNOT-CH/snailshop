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
        <div className={cn("flex items-center justify-between", className)}>
            <Breadcrumb className="w-fit">
                <BreadcrumbList className="flex-nowrap gap-1 sm:gap-1.5 px-1 py-1 text-sm sm:text-base">
                    {/* Home */}
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link
                                href="/"
                                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors duration-200"
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
                            <span key={index} className="contents">
                                <BreadcrumbSeparator>
                                    <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                                </BreadcrumbSeparator>
                                <BreadcrumbItem>
                                    {isLast || !item.href ? (
                                        <BreadcrumbPage className="text-primary font-medium truncate max-w-[200px] sm:max-w-none">
                                            {item.label}
                                        </BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink asChild>
                                            <Link
                                                href={item.href}
                                                className="text-muted-foreground hover:text-primary transition-colors duration-200"
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

            {showBackButton && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-primary hover:bg-accent/60 rounded-lg transition-colors duration-200"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    ย้อนกลับ
                </Button>
            )}
        </div>
    );
}

