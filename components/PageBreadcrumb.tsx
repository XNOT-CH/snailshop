"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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

export function PageBreadcrumb({ items: _items, className, showBackButton = true }: Readonly<PageBreadcrumbProps>) {
    const router = useRouter();

    return (
        <div className={cn("flex justify-end", className)}>
            {showBackButton && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="w-fit gap-1.5 rounded-full border border-border/70 bg-background/70 text-xs text-muted-foreground transition-colors duration-200 hover:bg-accent/70 hover:text-primary sm:text-sm"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    ย้อนกลับ
                </Button>
            )}
        </div>
    );
}
