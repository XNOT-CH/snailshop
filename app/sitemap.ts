import type { MetadataRoute } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { db, gachaMachines, helpArticles, products } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [productPages, helpDocs, machines] = await Promise.all([
        // Sold products are excluded: they get auto-deleted after sale, so their
        // URLs would turn into dead sitemap entries pointing at soft-404 pages.
        db.query.products.findMany({
            where: and(isNull(products.deletedAt), eq(products.isSold, false)),
            columns: { id: true, updatedAt: true },
        }),
        db.query.helpArticles.findMany({
            where: eq(helpArticles.isActive, true),
            columns: { updatedAt: true },
        }),
        db.query.gachaMachines.findMany({
            where: and(eq(gachaMachines.isActive, true), eq(gachaMachines.isEnabled, true)),
            columns: { id: true, gameType: true, updatedAt: true },
        }),
    ]);

    const latestHelpDate = helpDocs.reduce<Date | undefined>((latest, article) => {
        const current = article.updatedAt ? new Date(article.updatedAt) : undefined;
        if (!current) return latest;
        return !latest || current > latest ? current : latest;
    }, undefined);

    return [
        {
            url: absoluteUrl("/"),
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: absoluteUrl("/shop"),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: absoluteUrl("/help"),
            changeFrequency: "weekly",
            priority: 0.7,
            ...(latestHelpDate ? { lastModified: latestHelpDate } : {}),
        },
        {
            url: absoluteUrl("/gachapons"),
            changeFrequency: "daily",
            priority: 0.8,
        },
        {
            url: absoluteUrl("/gacha-grid"),
            changeFrequency: "daily",
            priority: 0.7,
        },
        {
            url: absoluteUrl("/terms"),
            changeFrequency: "yearly",
            priority: 0.3,
        },
        {
            url: absoluteUrl("/privacy"),
            changeFrequency: "yearly",
            priority: 0.3,
        },
        ...productPages.map((product) => ({
            url: absoluteUrl(`/product/${product.id}`),
            changeFrequency: "daily" as const,
            priority: 0.8,
            ...(product.updatedAt ? { lastModified: new Date(product.updatedAt) } : {}),
        })),
        ...machines.map((machine) => ({
            url: absoluteUrl(
                machine.gameType === "GRID_3X3"
                    ? `/gacha-grid/${machine.id}`
                    : `/gacha/${machine.id}`
            ),
            changeFrequency: "daily" as const,
            priority: 0.7,
            ...(machine.updatedAt ? { lastModified: new Date(machine.updatedAt) } : {}),
        })),
    ];
}
