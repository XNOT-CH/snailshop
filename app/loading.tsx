import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton, HeroBannerSkeleton } from "@/components/ProductCardSkeleton";

export default function Loading() {
    return (
        <div className="py-8 animate-fade-in">
            {/* Hero Skeleton */}
            <div className="mb-10">
                <HeroBannerSkeleton />
            </div>

            {/* Header Skeleton */}
            <div className="mb-8 space-y-2">
                <Skeleton className="h-8 w-48 animate-shimmer rounded-lg" />
                <Skeleton className="h-4 w-64 animate-shimmer rounded-lg" />
            </div>

            {/* Product Grid Skeleton */}
            <ProductGridSkeleton count={8} />
        </div>
    );
}
