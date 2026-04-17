import Image from "next/image";
import { db } from "@/lib/db";

// Server Component — ไม่ต้องการ 'use client' เพราะ query DB ตรงๆ บน server
export async function DynamicBackground() {
    const settings = await db.query.siteSettings.findFirst({
        columns: { backgroundImage: true, backgroundBlur: true },
    });

    const isBlur = settings?.backgroundBlur ?? true;

    if (!settings?.backgroundImage) {
        return <div className="fixed inset-0 -z-10 bg-slate-200/80 backdrop-blur-[2px] sm:hidden" aria-hidden="true" />;
    }

    return (
        <div className="fixed inset-0 -z-10 pointer-events-none">
            {/* Background Image */}
            <Image
                src={settings.backgroundImage}
                alt=""
                fill
                sizes="100vw"
                quality={70}
                className={`object-cover object-center ${isBlur ? "blur-sm scale-105" : ""}`}
                aria-hidden="true"
            />
            {/* Overlay: heavier when blurred, lighter when clear */}
            <div className={`absolute inset-0 ${isBlur
                ? "bg-gradient-to-b from-white/75 to-white/60"
                : "bg-gradient-to-b from-white/30 to-white/20"
                }`} />
        </div>
    );
}

