import type { Metadata } from "next";
import { db, helpArticles, helpVideos } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { HelpCircle, PlayCircle } from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { StructuredData } from "@/components/StructuredData";
import { buildPageMetadata } from "@/lib/seo";
import { getYouTubeEmbedUrl } from "@/lib/helpVideos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
    title: "ศูนย์ช่วยเหลือ",
    description: "รวมคำถามที่พบบ่อย วิธีใช้งาน และข้อมูลช่วยเหลือสำหรับลูกค้า",
    path: "/help",
});

const CATEGORIES: Record<string, string> = {
    general: "ทั่วไป",
    payment: "การชำระเงิน",
    account: "บัญชีผู้ใช้",
    order: "คำสั่งซื้อ",
    product: "สินค้า",
};

export default async function HelpPage() {
    const articles = await db.query.helpArticles.findMany({
        where: eq(helpArticles.isActive, true),
        orderBy: (t, { asc }) => [asc(t.category), asc(t.sortOrder)],
    });

    let videos: Awaited<ReturnType<typeof db.query.helpVideos.findMany>> = [];
    try {
        videos = await db.query.helpVideos.findMany({
            where: eq(helpVideos.isActive, true),
            orderBy: (t, { asc, desc }) => [asc(t.sortOrder), desc(t.createdAt)],
        });
    } catch (error) {
        console.error("[HELP_VIDEOS_FETCH]", error);
    }

    const groupedArticles = articles.reduce((acc, article) => {
        if (!acc[article.category]) {
            acc[article.category] = [];
        }
        acc[article.category].push(article);
        return acc;
    }, {} as Record<string, typeof articles>);

    const faqStructuredData = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: articles.map((article) => ({
            "@type": "Question",
            name: article.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: article.answer,
            },
        })),
    };

    return (
        <div className="animate-page-enter mx-auto max-w-6xl">
            {articles.length > 0 && <StructuredData data={faqStructuredData} />}

            <div className="border border-border/50 bg-card/90 px-4 py-6 shadow-xl shadow-primary/10 backdrop-blur-sm sm:px-6 sm:py-8">
                <PageBreadcrumb items={[{ label: "ศูนย์ช่วยเหลือ" }]} className="mb-6" />

                <div className="mb-8 text-center">
                    <div className="mb-4 flex items-center justify-center gap-3">
                        <HelpCircle className="h-10 w-10 text-primary" />
                        <h1 className="text-3xl font-bold">ศูนย์ช่วยเหลือ</h1>
                    </div>
                    <p className="text-muted-foreground">
                        คำถามที่พบบ่อย และวิธีการใช้งานต่าง ๆ
                    </p>
                </div>

                <div className="space-y-6">
                    {videos.length > 0 && (
                        <Card className="overflow-hidden border-primary/10 shadow-lg shadow-primary/5">
                            <CardHeader className="border-b border-border/60 bg-gradient-to-r from-blue-50 via-white to-cyan-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800">
                                <CardTitle className="flex items-center gap-2">
                                    <PlayCircle className="h-5 w-5 text-red-500" />
                                    วิดีโอช่วยเหลือ
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    ถ้าลูกค้ากำลังงง สามารถเริ่มดูวิธีแก้ปัญหาจากคลิปด้านล่างได้ทันที
                                </p>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {videos.map((video) => (
                                        <div
                                            key={video.id}
                                            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                                        >
                                            <div className="relative aspect-video overflow-hidden bg-black">
                                                <iframe
                                                    src={getYouTubeEmbedUrl(video.videoId)}
                                                    title={video.title}
                                                    className="h-full w-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            </div>
                                            <div className="p-4">
                                                <p className="line-clamp-2 text-sm font-semibold text-foreground">
                                                    {video.title}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {articles.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                ยังไม่มีคำถามในขณะนี้
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {Object.entries(groupedArticles).map(([category, items]) => (
                                <Card key={category}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-sm">
                                                {CATEGORIES[category] || category}
                                            </Badge>
                                            <span className="text-sm font-normal text-muted-foreground">
                                                ({items.length} คำถาม)
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Accordion type="single" collapsible className="w-full">
                                            {items.map((article, index) => (
                                                <AccordionItem key={article.id} value={article.id}>
                                                    <AccordionTrigger className="text-left hover:no-underline">
                                                        <span className="flex items-center gap-2">
                                                            <span className="font-medium text-primary">
                                                                Q{index + 1}.
                                                            </span>
                                                            {article.question}
                                                        </span>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="whitespace-pre-wrap pl-8 text-muted-foreground">
                                                        {article.answer}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </CardContent>
                                </Card>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
