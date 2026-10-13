import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { db, gachaMachines } from "@/lib/db";
import { GachaHubClient } from "@/components/GachaHubClient";
import { PageBand } from "@/components/PageBand";
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
    // Same frame as the shop: a glow behind the title, the machines on the tinted
    // band, and the column filling the screen so the old background stays hidden.
    return (
        <div className="animate-page-enter flex min-h-[calc(100dvh-4rem)] flex-col">
            <StructuredData data={structuredData} />
            <PageBand tone="lead" className="pt-10 pb-4 lg:pt-12 lg:pb-6">
                <h1 className="text-3xl font-bold leading-tight text-[var(--page-heading)] sm:text-4xl">ตู้กาชา</h1>
                <p className="mt-2 text-muted-foreground">สุ่มรางวัลจากตู้ที่เปิดอยู่ตอนนี้</p>
            </PageBand>

            <PageBand tone="plain" className="flex-1 pt-6 lg:pt-8">
                <GachaHubClient
                    machines={machines.map((machine) => ({
                        ...machine,
                        costAmount: Number(machine.costAmount),
                    }))}
                />
            </PageBand>
        </div>
    );
}
