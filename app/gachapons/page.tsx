import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db, gachaMachines } from "@/lib/db";
import { GachaHubClient } from "@/components/GachaHubClient";
import { StructuredData } from "@/components/StructuredData";
import { buildPageMetadata, absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
    title: "หมวดหมู่กาชา",
    description: "รวมตู้กาชาและเครื่องสุ่มทั้งหมด พร้อมแยกตามหมวดหมู่",
    path: "/gachapons",
});

export default async function GachaHubPage() {
    const machines = await db.query.gachaMachines.findMany({
        where: and(eq(gachaMachines.isActive, true), eq(gachaMachines.isEnabled, true)),
        orderBy: (t, { asc }) => asc(t.sortOrder),
        columns: {
            id: true,
            name: true,
            imageUrl: true,
            gameType: true,
            costType: true,
            costAmount: true,
            categoryId: true,
        },
        with: {
            category: { columns: { id: true, name: true } },
        },
    });

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "หมวดหมู่กาชา",
        url: absoluteUrl("/gachapons"),
        hasPart: machines.map((machine) => ({
            "@type": "ListItem",
            name: machine.name,
            url: absoluteUrl(machine.gameType === "GRID_3X3" ? `/gacha-grid/${machine.id}` : `/gacha/${machine.id}`),
        })),
    };
    return (
        <div className="animate-page-enter">
            <StructuredData data={structuredData} />
            <div className="relative left-1/2 w-screen -translate-x-1/2 border-y border-border/50 bg-card/90 px-3 pb-8 pt-4 shadow-xl shadow-primary/10 backdrop-blur-sm sm:left-auto sm:w-auto sm:translate-x-0 sm:border sm:bg-card/90 sm:px-5 sm:py-7 sm:backdrop-blur-sm lg:px-6">
                <div className="relative left-1/2 mb-6 w-screen -translate-x-1/2 sm:left-auto sm:mb-8 sm:w-auto sm:translate-x-0">
                    <div className="relative overflow-hidden bg-gradient-to-br from-[#1a56db] via-[#1f4fc2] to-[#10284d] px-6 py-10 text-center">
                        <div
                            className="absolute inset-0 opacity-10"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpolygon points='30,0 60,17 60,35 30,52 0,35 0,17' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
                                backgroundSize: "60px 52px",
                            }}
                        />
                        <h1 className="relative z-10 mb-2 text-3xl font-bold tracking-wide text-white">หมวดหมู่กาชา</h1>
                        <p className="relative z-10 flex items-center justify-center gap-1.5 text-sm font-medium text-blue-200">
                            <Link href="/" className="transition-colors hover:text-white">หน้าหลัก</Link>
                            <span className="opacity-60">&gt;</span>
                            <span className="font-semibold text-white">หมวดหมู่กาชา</span>
                        </p>
                    </div>
                </div>

                <GachaHubClient
                    machines={machines.map((machine) => ({
                        ...machine,
                        costAmount: Number(machine.costAmount),
                    }))}
                />
            </div>
        </div>
    );
}
