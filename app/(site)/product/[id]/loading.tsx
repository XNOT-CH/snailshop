import { PageBand } from "@/components/PageBand";
import { Skeleton } from "@/components/ui/skeleton";

// Grey boxes in the shape of the product page — image, details and the
// "รายการสินค้าอื่น ๆ" grid — so the layout is already there while it loads.
export default function Loading() {
    return (
        <div className="flex min-h-[calc(100dvh-4rem)] flex-col" aria-busy="true" aria-label="กำลังโหลดสินค้า">
            <PageBand tone="lead" className="pt-6 pb-4 lg:pt-8 lg:pb-6">
                <Skeleton className="mb-6 h-5 w-40" />
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] xl:gap-12">
                    <Skeleton className="aspect-square w-full rounded-2xl" />
                    <div className="space-y-4">
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-7 w-32" />
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="mt-6 h-12 w-full rounded-xl" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                </div>
            </PageBand>

            <PageBand tone="plain" className="flex-1 pt-10 lg:pt-12">
                <Skeleton className="mb-6 h-7 w-48" />
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    {Array.from({ length: 4 }, (_, index) => (
                        <div key={index} className="space-y-3">
                            <Skeleton className="aspect-square w-full rounded-xl" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-5 w-1/2" />
                        </div>
                    ))}
                </div>
            </PageBand>
        </div>
    );
}
