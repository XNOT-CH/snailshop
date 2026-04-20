import Image from "next/image";
import { db } from "@/lib/db";

// Server Component — ไม่ต้องการ 'use client' เพราะ query DB ตรงๆ บน server
export async function DynamicBackground() {
    const settings = await db.query.siteSettings.findFirst({
        columns: { backgroundImage: true, backgroundBlur: true },
    });

    const isBlur = settings?.backgroundBlur ?? true;

    if (!settings?.backgroundImage) {
        return <div className="fixed inset-0 -z-10 bg-[#eaf2fb] backdrop-blur-[2px] dark:bg-[#08111c] sm:hidden" aria-hidden="true" />;
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
            <div
                className={`absolute inset-0 ${
                    isBlur
                        ? "bg-gradient-to-b from-[#f5f9ff]/74 via-[#edf4fb]/68 to-[#e8f0fa]/62 dark:from-[#101a2c]/86 dark:via-[#0c1727]/80 dark:to-[#09111c]/76"
                        : "bg-gradient-to-b from-[#f5f9ff]/42 via-[#edf4fb]/36 to-[#e8f0fa]/30 dark:from-[#101a2c]/62 dark:via-[#0c1727]/54 dark:to-[#09111c]/48"
                }`}
            />
        </div>
    );
}

