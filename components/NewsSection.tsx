"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, ArrowRight, Loader2, Newspaper } from "lucide-react";
import { useState, useEffect } from "react";

interface NewsArticle {
    id: string;
    title: string;
    description: string;
    imageUrl: string | null;
    link: string | null;
    createdAt: string;
}

export function NewsSection() {
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const res = await fetch("/api/news");
                if (res.ok) {
                    const data = await res.json();
                    setNews(data);
                }
            } catch (error) {
                console.error("Error fetching news:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, []);

    // Format date to Thai format
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const thaiMonths = [
            "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
            "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
        ];
        const day = date.getDate();
        const month = thaiMonths[date.getMonth()];
        const year = date.getFullYear() + 543; // Convert to Buddhist Era
        return `${day} ${month} ${year}`;
    };

    // Don't render if no news
    if (!loading && news.length === 0) {
        return null;
    }

    return (
        <section className="mt-6">
            {/* Section Header */}
            <div className="mb-4 text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    ข่าวสารและโปรโมชั่น
                </h2>
                <p className="text-sm text-muted-foreground uppercase tracking-wider mt-1">
                    NEWS AND PROMOTIONS
                </p>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                /* News Grid */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {news.map((article) => (
                        <article
                            key={article.id}
                            className="bg-white dark:bg-card border border-slate-100 dark:border-border rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group"
                        >
                            {/* Image */}
                            <div className="relative w-full aspect-video overflow-hidden">
                                {article.imageUrl ? (
                                    <Image
                                        src={article.imageUrl}
                                        alt={article.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src =
                                                "https://placehold.co/800x450/3b82f6/ffffff?text=News";
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                        <Newspaper className="h-12 w-12 text-primary/40" />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4 sm:p-5">
                                {/* Title */}
                                <h3 className="font-bold text-foreground text-lg mb-2 group-hover:text-primary transition-colors">
                                    {article.title}
                                </h3>

                                {/* Description - 2 lines max */}
                                <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                                    {article.description}
                                </p>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-border">
                                    {/* Date */}
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{formatDate(article.createdAt)}</span>
                                    </div>

                                    {/* Read More Link */}
                                    {article.link && (
                                        <Link
                                            href={article.link}
                                            className="flex items-center gap-1 text-primary hover:text-primary/80 text-xs sm:text-sm font-medium transition-colors group/link"
                                        >
                                            <span>อ่านเพิ่มเติม</span>
                                            <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
