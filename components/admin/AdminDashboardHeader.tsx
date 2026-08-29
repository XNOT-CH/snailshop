interface AdminDashboardHeaderProps {
    title?: string;
    subtitle?: string;
}

export function AdminDashboardHeader({
    title = "แดชบอร์ด",
    subtitle = "ภาพรวมข้อมูลธุรกิจของคุณ",
}: Readonly<AdminDashboardHeaderProps>) {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    {title}
                </h1>
                <p className="text-muted-foreground">
                    {subtitle}
                </p>
            </div>
        </div>
    );
}
