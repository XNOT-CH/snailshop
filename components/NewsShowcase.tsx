"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Calendar, Newspaper } from "lucide-react";
import { toSafePublicHref } from "@/lib/sanitize";
import { IMAGE_UPLOAD_RECOMMENDATIONS } from "@/lib/imageUploadRecommendations";

export interface NewsArticle {
    id: string;
    title: string;
    description: string;
    imageUrl: string | null;
    link: string | null;
    createdAt: string;
}

const ROTATE_MS = 5000;
const SWIPE_MIN_PX = 40;

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
const TITLE_HOVER = "font-semibold transition-colors duration-300 ease-out group-hover:text-primary";

// The large slot cycles through every article on its own; the list beside it
// (desktop only) marks which one is showing. Rotation pauses while the pointer
// or keyboard focus is on it, and never starts for reduced-motion users.
// Phones get the large slot alone, with swipe and the dots to move between.
export function NewsShowcase({ news }: Readonly<{ news: NewsArticle[] }>) {
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);
    const touchStartX = useRef<number | null>(null);
    const rotates = news.length > 1;

    // Restarted on every change of slide, so a manual pick gets a full interval.
    useEffect(() => {
        if (!rotates || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const timer = setTimeout(() => setActive((current) => (current + 1) % news.length), ROTATE_MS);
        return () => clearTimeout(timer);
    }, [active, paused, rotates, news.length]);

    const step = (delta: number) => setActive((current) => (current + delta + news.length) % news.length);
    const lead = news[active];

    return (
        <div className={rotates ? "grid gap-8 lg:grid-cols-[3fr_2fr] lg:gap-10" : "max-w-3xl"}>
            <div
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX; }}
                onTouchEnd={(event) => {
                    if (touchStartX.current === null) return;
                    const dx = event.changedTouches[0].clientX - touchStartX.current;
                    touchStartX.current = null;
                    if (rotates && Math.abs(dx) >= SWIPE_MIN_PX) step(dx < 0 ? 1 : -1);
                }}
            >
                <ArticleLink article={lead} className="group block">
                    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted">
                        {news.map((article, index) => (
                            <div
                                key={article.id}
                                aria-hidden={index !== active}
                                className={`absolute inset-0 transition-opacity duration-700 ease-out ${index === active ? "opacity-100" : "opacity-0"}`}
                            >
                                {article.imageUrl ? (
                                    <Image
                                        src={article.imageUrl}
                                        alt={article.title}
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
                        ))}
                    </div>
                    <div key={lead.id} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
                        <h3 className={`${TITLE_HOVER} mt-4 line-clamp-2 text-lg leading-snug text-foreground sm:text-xl`}>{lead.title}</h3>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{lead.description}</p>
                    </div>
                </ArticleLink>
                <div className="mt-3 flex items-center justify-between gap-4">
                    <ArticleDate createdAt={lead.createdAt} />
                    {rotates && (
                        <div className="flex items-center gap-1.5">
                            {news.map((article, index) => (
                                <button
                                    key={article.id}
                                    type="button"
                                    onClick={() => setActive(index)}
                                    aria-label={`ข่าวที่ ${index + 1}: ${article.title}`}
                                    aria-current={index === active}
                                    className="flex h-6 items-center"
                                >
                                    <span className={`block h-1.5 rounded-full transition-[width,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${index === active ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"}`} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {rotates && (
                <div className="hidden flex-col gap-5 lg:flex">
                    {news.map((article, index) => (
                        <ArticleLink key={article.id} article={article} className="group flex items-start gap-4">
                            <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-xl bg-muted">
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
                                <h3 className={`${TITLE_HOVER} line-clamp-2 text-base leading-snug ${index === active ? "text-primary" : "text-foreground"}`}>{article.title}</h3>
                                <div className="mt-2">
                                    <ArticleDate createdAt={article.createdAt} />
                                </div>
                            </div>
                        </ArticleLink>
                    ))}
                </div>
            )}
        </div>
    );
}
