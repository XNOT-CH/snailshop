import type { Metadata } from "next";
import { db, helpArticles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { HelpCircle } from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { StructuredData } from "@/components/StructuredData";
import { buildPageMetadata } from "@/lib/seo";

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
        <div className="animate-page-enter max-w-4xl mx-auto">
            {articles.length > 0 && <StructuredData data={faqStructuredData} />}

            <div className="py-6 sm:py-8 bg-card/90 backdrop-blur-sm px-4 sm:px-6 shadow-xl shadow-primary/10 border border-border/50">
                <PageBreadcrumb items={[{ label: "ศูนย์ช่วยเหลือ" }]} className="mb-6" />

                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <HelpCircle className="h-10 w-10 text-primary" />
                        <h1 className="text-3xl font-bold">ศูนย์ช่วยเหลือ</h1>
                    </div>
                    <p className="text-muted-foreground">
                        คำถามที่พบบ่อย และวิธีการใช้งานต่าง ๆ
                    </p>
                </div>

                {articles.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            ยังไม่มีคำถามในขณะนี้
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
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
                                                        <span className="text-primary font-medium">
                                                            Q{index + 1}.
                                                        </span>
                                                        {article.question}
                                                    </span>
                                                </AccordionTrigger>
                                                <AccordionContent className="text-muted-foreground whitespace-pre-wrap pl-8">
                                                    {article.answer}
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
