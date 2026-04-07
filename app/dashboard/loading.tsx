export default function DashboardLoading() {
    return (
        <div className="space-y-8 animate-page-enter">
            <div className="space-y-2">
                <div className="h-8 w-64 skeleton-wave"></div>
                <div className="h-4 w-80 skeleton-wave"></div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={`rounded-2xl p-6 space-y-4 animate-card-up stagger-${i}`}
                        style={{ background: i === 1 ? 'hsl(var(--primary)/0.1)' : 'hsl(var(--card))' }}
                    >
                        <div className="h-4 w-24 skeleton-wave"></div>
                        <div className="h-10 w-40 skeleton-wave"></div>
                        <div className="h-9 w-full skeleton-wave"></div>
                    </div>
                ))}
            </div>

            <div className="h-px skeleton-wave"></div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-6 w-40 skeleton-wave"></div>
                        <div className="h-4 w-56 skeleton-wave"></div>
                    </div>
                    <div className="h-9 w-24 skeleton-wave"></div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[4, 5, 6].map((i) => (
                        <div key={i} className={`rounded-2xl overflow-hidden animate-card-up stagger-${i}`}>
                            <div className="aspect-[4/3] skeleton-wave"></div>
                            <div className="p-4 space-y-2" style={{ background: 'hsl(var(--card))' }}>
                                <div className="h-5 w-3/4 skeleton-wave"></div>
                                <div className="h-3 w-1/3 skeleton-wave"></div>
                                <div className="h-8 w-full skeleton-wave mt-3"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
