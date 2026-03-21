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
        const year = date.getFullYear() + 543;
        return `${day} ${month} ${year}`;
    };

    // Don't render if no news
    if (!loading && news.length === 0) {
        return null;
    }

    return (
        <section className="mt-6">
            {/* Section Header */}
            <div className="mb-5 text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    ข่าวสารและโปรโมชั่น
                </h2>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {news.map((article) => (
                        <article
                            key={article.id}
                            className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 group flex flex-col"
                        >
                            {/* Image */}
                            <div className="relative w-full aspect-video overflow-hidden bg-muted">
                                {article.imageUrl ? (
                                    <Image
                                        src={article.imageUrl}
                                        alt={article.title}
                                        fill
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        className="object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src =
                                                "https://placehold.co/800x450/1e293b/94a3b8?text=News";
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-muted">
                                        <Newspaper className="h-10 w-10 text-muted-foreground/30" />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex flex-col flex-1 p-4 sm:p-5">
                                {/* Title */}
                                <h3 className="font-semibold text-foreground text-base leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
                                    {article.title}
                                </h3>

                                {/* Description */}
                                <p className="text-muted-foreground text-sm line-clamp-2 flex-1 mb-4">
                                    {article.description}
                                </p>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-border">
                                    {/* Date */}
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{formatDate(article.createdAt)}</span>
                                    </div>

                                    {/* Read More Link */}
                                    {article.link && (
                                        <Link
                                            href={article.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-primary hover:text-primary/80 text-xs font-medium transition-colors group/link"
                                        >
                                            <span>อ่านเพิ่มเติม</span>
                                            <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
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
