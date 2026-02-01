import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, ChevronDown } from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export const dynamic = "force-dynamic";

const CATEGORIES: Record<string, string> = {
    general: "ทั่วไป",
    payment: "การชำระเงิน",
    account: "บัญชีผู้ใช้",
    order: "คำสั่งซื้อ",
    product: "สินค้า",
};

export default async function HelpPage() {
    const articles = await db.helpArticle.findMany({
        where: { isActive: true },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });

    // Group by category
    const groupedArticles = articles.reduce((acc, article) => {
        if (!acc[article.category]) {
            acc[article.category] = [];
        }
        acc[article.category].push(article);
        return acc;
    }, {} as Record<string, typeof articles>);

    return (
        <div className="animate-page-enter max-w-4xl mx-auto">
            <div className="py-8 bg-card/90 backdrop-blur-sm rounded-2xl px-6 shadow-xl shadow-primary/10 border border-border/50">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <HelpCircle className="h-10 w-10 text-primary" />
                        <h1 className="text-3xl font-bold">ศูนย์ช่วยเหลือ</h1>
                    </div>
                    <p className="text-muted-foreground">
                        คำถามที่พบบ่อย และวิธีการใช้งานต่างๆ
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
