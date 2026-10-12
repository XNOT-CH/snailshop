import Image from "next/image";
import type { ReactNode } from "react";
import { Calendar, Newspaper } from "lucide-react";
import { HomeSectionHeading } from "@/components/HomeSections";
import { toSafePublicHref } from "@/lib/sanitize";
import { IMAGE_UPLOAD_RECOMMENDATIONS } from "@/lib/imageUploadRecommendations";

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

// Articles without a usable link still render, just not as a link.
function ArticleLink({ article, className, children }: Readonly<{ article: NewsArticle; className: string; children: ReactNode }>) {
    const href = toSafePublicHref(article.link, "");
    if (!href) return <div className={className}>{children}</div>;
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
            {children}
        </a>
    );
}

function ArticleDate({ createdAt }: Readonly<{ createdAt: string }>) {
    return (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(createdAt)}
        </span>
    );
}

const IMAGE_HOVER = "object-cover transition-[scale] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]";
const TITLE_HOVER = "font-semibold text-foreground transition-colors duration-300 ease-out group-hover:text-primary";

// The newest article leads with a large image; the rest sit beside it as a
// compact list. No card boxes or dividers — spacing does the separating.
export function NewsSection({ initialNews }: Readonly<NewsSectionProps>) {
    const news = initialNews ?? [];

    if (news.length === 0) {
        return null;
    }

    const [lead, ...rest] = news;

    return (
        <section>
            <HomeSectionHeading title="ข่าวสารและโปรโมชั่น" />

            <div className={rest.length > 0 ? "grid gap-8 lg:grid-cols-[3fr_2fr] lg:gap-10" : "max-w-3xl"}>
                <ArticleLink article={lead} className="group block">
                    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted">
                        {lead.imageUrl ? (
                            <Image
                                src={lead.imageUrl}
                                alt={lead.title}
                                fill
                                sizes="(max-width: 1024px) 100vw, 60vw"
                                loading="lazy"
                                className={IMAGE_HOVER}
                            />
                        ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground/40">
                                <Newspaper className="h-10 w-10" />
                                <span className="text-xs">{IMAGE_UPLOAD_RECOMMENDATIONS.newsCover}</span>
                            </div>
                        )}
                    </div>
                    <h3 className={`${TITLE_HOVER} mt-4 line-clamp-2 text-lg leading-snug sm:text-xl`}>{lead.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{lead.description}</p>
                    <div className="mt-3">
                        <ArticleDate createdAt={lead.createdAt} />
                    </div>
                </ArticleLink>

                {rest.length > 0 && (
                    <div className="flex flex-col gap-5">
                        {rest.map((article) => (
                            <ArticleLink key={article.id} article={article} className="group flex items-start gap-4">
                                <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-xl bg-muted sm:w-40">
                                    {article.imageUrl ? (
                                        <Image
                                            src={article.imageUrl}
                                            alt={article.title}
                                            fill
                                            sizes="160px"
                                            loading="lazy"
                                            className={IMAGE_HOVER}
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                                            <Newspaper className="h-6 w-6" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className={`${TITLE_HOVER} line-clamp-2 text-sm leading-snug sm:text-base`}>{article.title}</h3>
                                    <div className="mt-2">
                                        <ArticleDate createdAt={article.createdAt} />
                                    </div>
                                </div>
                            </ArticleLink>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
