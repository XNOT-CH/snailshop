import Image from "next/image";
import { db } from "@/lib/db";

// Server Component — ไม่ต้องการ 'use client' เพราะ query DB ตรงๆ บน server
export async function DynamicBackground() {
    const settings = await db.query.siteSettings.findFirst({
        columns: { backgroundImage: true },
    });

    if (!settings?.backgroundImage) return null;

    return (
        <div className="fixed inset-0 -z-10 pointer-events-none">
            {/* Next.js Image: auto WebP conversion + proper sizing */}
            <Image
                src={settings.backgroundImage}
                alt=""
                fill
                sizes="100vw"
                quality={70}
                className="object-cover object-center"
                aria-hidden="true"
            />
            {/* Light overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/70 to-white/50" />
        </div>
    );
}

