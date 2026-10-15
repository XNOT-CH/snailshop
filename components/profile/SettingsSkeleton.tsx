// Mirrors the settings page layout (header, section tabs, one section card) so
// the route skeleton and the client-side profile fetch hand over without a jump.
export function SettingsSkeleton() {
    return (
        <div className="w-full space-y-6" aria-busy="true" aria-label="กำลังโหลดข้อมูล...">
            <div className="flex justify-end">
                <div className="h-8 w-24 skeleton-wave rounded-full" />
            </div>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
                <div className="h-16 w-16 shrink-0 skeleton-wave rounded-full" />
                <div className="flex w-full flex-1 flex-col items-center gap-2 sm:items-start">
                    <div className="h-9 w-48 skeleton-wave rounded-lg" />
                    <div className="h-4 w-64 max-w-full skeleton-wave rounded" />
                </div>
                <div className="w-full max-w-xs space-y-2 sm:w-56">
                    <div className="h-4 w-40 skeleton-wave rounded" />
                    <div className="h-1.5 w-full skeleton-wave rounded-full" />
                </div>
            </div>

            <div className="hidden gap-7 border-b border-border pb-3 sm:flex">
                <div className="h-5 w-24 skeleton-wave rounded" />
                <div className="h-5 w-28 skeleton-wave rounded" />
                <div className="h-5 w-16 skeleton-wave rounded" />
                <div className="h-5 w-32 skeleton-wave rounded" />
            </div>

            <div className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
                <div className="space-y-2">
                    <div className="h-5 w-32 skeleton-wave rounded" />
                    <div className="h-4 w-56 max-w-full skeleton-wave rounded" />
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                            <div className="h-4 w-24 skeleton-wave rounded" />
                            <div className="h-10 w-full skeleton-wave rounded-lg" />
                        </div>
                    ))}
                </div>
                <div className="flex justify-end">
                    <div className="h-11 w-36 skeleton-wave rounded-xl" />
                </div>
            </div>
        </div>
    );
}
