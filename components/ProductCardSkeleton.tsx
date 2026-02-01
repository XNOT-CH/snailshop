import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export function ProductCardSkeleton({ index = 0 }: { index?: number }) {
    return (
        <Card className={`overflow-hidden rounded-2xl glow-border animate-fade-in-up opacity-0 stagger-${Math.min(index + 1, 8)}`}>
            {/* Image Skeleton */}
            <div className="relative aspect-[4/3]">
                <div className="h-full w-full animate-shimmer rounded-t-2xl" />
            </div>

            {/* Content Skeleton */}
            <CardContent className="p-3 space-y-2">
                <div className="h-5 w-3/4 animate-skeleton bg-slate-200 dark:bg-slate-700 rounded-lg" />
                <div className="h-6 w-1/3 animate-skeleton bg-slate-200 dark:bg-slate-700 rounded-lg" />
            </CardContent>

            {/* Footer Skeleton */}
            <CardFooter className="flex gap-2 p-3 pt-0">
                <div className="h-8 flex-1 animate-skeleton bg-slate-200 dark:bg-slate-700 rounded-xl" />
                <div className="h-8 flex-1 animate-skeleton bg-slate-200 dark:bg-slate-700 rounded-xl" />
            </CardFooter>
        </Card>
    );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <ProductCardSkeleton key={i} index={i} />
            ))}
        </div>
    );
}

export function HeroBannerSkeleton() {
    return (
        <div className="relative w-full overflow-hidden rounded-2xl animate-fade-in-scale" style={{ aspectRatio: "4/1" }}>
            <div className="h-full w-full animate-shimmer" />
        </div>
    );
}

export function NavbarSkeleton() {
    return (
        <div className="h-16 border-b border-slate-700/50 bg-[#0f172a]">
            <div className="max-w-7xl mx-auto flex h-full items-center justify-between px-4">
                <div className="h-9 w-32 animate-skeleton bg-slate-700 rounded-xl" />
                <div className="hidden md:flex gap-4">
                    <div className="h-8 w-20 animate-skeleton bg-slate-700 rounded-xl" />
                    <div className="h-8 w-20 animate-skeleton bg-slate-700 rounded-xl" />
                    <div className="h-8 w-20 animate-skeleton bg-slate-700 rounded-xl" />
                </div>
                <div className="flex gap-3">
                    <div className="h-9 w-24 animate-skeleton bg-slate-700 rounded-xl" />
                    <div className="h-9 w-9 animate-skeleton bg-slate-700 rounded-full" />
                </div>
            </div>
        </div>
    );
}

export function DashboardCardSkeleton() {
    return (
        <Card className="overflow-hidden rounded-2xl glow-border p-6 animate-fade-in-up opacity-0">
            <div className="space-y-3">
                <div className="h-4 w-1/3 animate-skeleton bg-slate-200 rounded-lg" />
                <div className="h-10 w-1/2 animate-skeleton bg-slate-200 rounded-lg" />
                <div className="h-3 w-2/3 animate-skeleton bg-slate-200 rounded-lg" />
            </div>
        </Card>
    );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="rounded-2xl glow-border overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="bg-slate-50 p-4 flex gap-4">
                <div className="h-5 w-20 animate-skeleton bg-slate-200 rounded" />
                <div className="h-5 flex-1 animate-skeleton bg-slate-200 rounded" />
                <div className="h-5 w-24 animate-skeleton bg-slate-200 rounded" />
                <div className="h-5 w-16 animate-skeleton bg-slate-200 rounded" />
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="p-4 flex gap-4 border-t border-slate-100">
                    <div className="h-10 w-10 animate-skeleton bg-slate-100 rounded-lg" />
                    <div className="h-5 flex-1 animate-skeleton bg-slate-100 rounded" />
                    <div className="h-5 w-24 animate-skeleton bg-slate-100 rounded" />
                    <div className="h-5 w-16 animate-skeleton bg-slate-100 rounded" />
                </div>
            ))}
        </div>
    );
}
