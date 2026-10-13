import { HomeSectionHeading } from "@/components/HomeSections";
import { NewsShowcase, type NewsArticle } from "@/components/NewsShowcase";

interface NewsSectionProps {
    initialNews?: NewsArticle[];
}

export function NewsSection({ initialNews }: Readonly<NewsSectionProps>) {
    const news = initialNews ?? [];

    if (news.length === 0) {
        return null;
    }

    return (
        <section>
            <HomeSectionHeading title="ข่าวสารและโปรโมชั่น" />
            <NewsShowcase news={news} />
        </section>
    );
}
