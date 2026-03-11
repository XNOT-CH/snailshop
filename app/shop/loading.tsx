import { ProductGridSkeleton } from "@/components/ProductCardSkeleton";

export default function ShopLoading() {
    return (
        <div className="py-8">
            {/* Header Skeleton */}
            <div className="mb-8 space-y-3">
                <div className="h-9 w-48 skeleton-wave"></div>
                <div className="h-4 w-72 skeleton-wave"></div>
            </div>

            {/* Filter Bar Skeleton */}
            <div className="flex gap-3 mb-6 flex-wrap">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-9 w-24 skeleton-wave rounded-full"></div>
                ))}
            </div>

            {/* Product Grid Skeleton */}
            <ProductGridSkeleton count={8} />
        </div>
    );
}
