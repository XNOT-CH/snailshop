export default function Loading() {
    return (
        <div className="space-y-6" aria-busy="true" aria-label="กำลังโหลดกระเป๋าเงิน...">
            <div className="flex justify-end">
                <div className="h-8 w-24 skeleton-wave rounded-full" />
            </div>
            <div className="space-y-3">
                <div className="h-10 w-56 skeleton-wave rounded-lg" />
                <div className="h-4 w-80 max-w-full skeleton-wave rounded" />
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-4 rounded-2xl border border-border bg-card p-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 skeleton-wave rounded-xl" />
                            <div className="h-5 w-20 skeleton-wave rounded" />
                        </div>
                        <div className="h-10 w-32 skeleton-wave rounded-lg" />
                        <div className="h-4 w-full skeleton-wave rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}
