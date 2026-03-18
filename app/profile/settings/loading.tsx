export default function SettingsLoading() {
    return (
        <div className="min-h-screen bg-muted py-8 px-4">
            <div className="max-w-6xl mx-auto space-y-5">

                {/* Breadcrumb Skeleton */}
                <div className="h-5 w-48 skeleton-wave rounded" />

                {/* Page Header Skeleton */}
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-muted w-14 h-14 skeleton-wave" />
                    <div className="space-y-2">
                        <div className="h-7 w-36 skeleton-wave rounded" />
                        <div className="h-4 w-64 skeleton-wave rounded" />
                    </div>
                </div>

                {/* Row 1: Contact Info + Personal Info */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {[0, 1].map((i) => (
                        <div key={i} className="rounded-2xl bg-card p-6 space-y-5 shadow-sm">
                            {/* Card Header */}
                            <div className="space-y-1.5">
                                <div className="h-5 w-32 skeleton-wave rounded" />
                                <div className="h-3.5 w-48 skeleton-wave rounded" />
                            </div>
                            {/* Fields */}
                            {[1, 2, 3, 4].map((j) => (
                                <div key={j} className="space-y-2">
                                    <div className="h-3.5 w-24 skeleton-wave rounded" />
                                    <div className="h-10 w-full skeleton-wave rounded-lg" />
                                </div>
                            ))}
                            {/* Button */}
                            <div className="flex justify-end pt-1">
                                <div className="h-9 w-24 skeleton-wave rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Row 2: Tax + Shipping Address */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {[0, 1].map((i) => (
                        <div key={i} className="rounded-2xl bg-card p-6 space-y-4 shadow-sm">
                            {/* Card Header */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-1.5">
                                    <div className="h-5 w-40 skeleton-wave rounded" />
                                    <div className="h-3.5 w-52 skeleton-wave rounded" />
                                </div>
                                <div className="h-8 w-20 skeleton-wave rounded-full" />
                            </div>
                            {/* Address display placeholder */}
                            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                                <div className="h-4 w-3/4 skeleton-wave rounded" />
                                <div className="h-4 w-1/2 skeleton-wave rounded" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Row 3: Password (full width) */}
                <div className="rounded-2xl bg-card p-6 space-y-5 shadow-sm">
                    <div className="space-y-1.5">
                        <div className="h-5 w-36 skeleton-wave rounded" />
                        <div className="h-3.5 w-52 skeleton-wave rounded" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[0, 1].map((i) => (
                            <div key={i} className="space-y-2">
                                <div className="h-3.5 w-28 skeleton-wave rounded" />
                                <div className="h-10 w-full skeleton-wave rounded-lg" />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end pt-1">
                        <div className="h-9 w-24 skeleton-wave rounded-full" />
                    </div>
                </div>

            </div>
        </div>
    );
}
