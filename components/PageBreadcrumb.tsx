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

export function PageBreadcrumb({ className, showBackButton = true }: Readonly<PageBreadcrumbProps>) {
    const router = useRouter();

    return (
        <div className={cn("flex justify-end", className)}>
            {showBackButton && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="h-10 w-fit gap-1.5 rounded-full border border-border bg-background/70 px-4 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-accent/70 hover:text-primary sm:text-base"
                >
                    <ArrowLeft className="h-4 w-4" />
                    ย้อนกลับ
                </Button>
            )}
        </div>
    );
}
