import Image from "next/image";
import Link from "next/link";
import { Calendar, ArrowRight, Newspaper } from "lucide-react";
import { themeClasses } from "@/lib/theme";

interface NewsArticle {
    id: string;
    title: string;
    description: string;
    imageUrl: string | null;
    link: string | null;
    createdAt: string;
}

interface NewsSectionProps {
    initialNews?: NewsArticle[];
}

export function NewsSection({ initialNews }: Readonly<NewsSectionProps>) {
    const news = initialNews ?? [];

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

    if (news.length === 0) {
        return null;
    }

    return (
        <section className="mt-0 sm:mt-6">
            {/* Section Header */}
            <div className="mb-5 text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    ข่าวสารและโปรโมชั่น
                </h2>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
                    NEWS AND PROMOTIONS
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {news.map((article) => (
                    <article
                        key={article.id}
                        className={`${themeClasses.surface} group flex flex-col overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_38px_-28px_rgba(39,71,121,0.18)] dark:hover:shadow-[0_24px_48px_-32px_rgba(0,0,0,0.9)]`}
                    >
                            <div className="relative w-full aspect-video overflow-hidden bg-muted">
                                {article.imageUrl ? (
                                    <Image
                                        src={article.imageUrl}
                                        alt={article.title}
                                        fill
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        loading="lazy"
                                        fetchPriority="low"
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-muted">
                                        <Newspaper className="h-10 w-10 text-muted-foreground/30" />
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col flex-1 p-4 sm:p-5">
                                <h3 className="font-semibold text-foreground text-base leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
                                    {article.title}
                                </h3>

                                <p className="text-muted-foreground text-sm line-clamp-2 flex-1 mb-4">
                                    {article.description}
                                </p>

                                <div className="flex items-center justify-between border-t border-border/80 pt-3">
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{formatDate(article.createdAt)}</span>
                                    </div>

                                    {article.link && (
                                        <Link
                                            href={article.link}
                                            prefetch={false}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`${themeClasses.link} group/link flex items-center gap-1 text-xs font-medium transition-colors`}
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
        </section>
    );
}
