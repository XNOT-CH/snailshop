import { SettingsSkeleton } from "@/components/profile/SettingsSkeleton";

export default function SettingsLoading() {
    return (
        <div className="min-h-screen bg-[linear-gradient(var(--page-glow),var(--page-base)_320px)] px-3 pt-4 sm:px-6 sm:py-8">
            <div className="mx-auto max-w-7xl">
                <SettingsSkeleton />
            </div>
        </div>
    );
}
