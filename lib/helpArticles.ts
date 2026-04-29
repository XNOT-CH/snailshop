type HelpArticleLike = {
    question: string;
    answer: string;
    category: string;
};

type PinFallbackArticle<TId = string> = HelpArticleLike & {
    id: TId;
    sortOrder: number;
    isActive: boolean;
};

const PIN_TOPIC_RULES = {
    setup: [/pin/i, /คืออะไร|ใช้ทำอะไร|ตั้ง pin/i],
    reset: [/pin/i, /ลืม|รีเซ็ต/i],
    lock: [/pin/i, /ล็อก|ชั่วคราว|ผิดหลายครั้ง/i],
    protected: [/pin/i, /ตอนไหน|รายการสำคัญ|ขอ pin/i],
} as const;

const PIN_TOPIC_BY_ID: Record<string, keyof typeof PIN_TOPIC_RULES> = {
    "pin-faq-setup": "setup",
    "pin-faq-reset": "reset",
    "pin-faq-lock": "lock",
    "pin-faq-protected": "protected",
};

function normalizeText(value: string) {
    return value
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "")
        .trim();
}

function matchesPinTopic(article: HelpArticleLike, topic: keyof typeof PIN_TOPIC_RULES) {
    const haystack = `${article.question} ${article.answer}`;
    return PIN_TOPIC_RULES[topic].every((pattern) => pattern.test(haystack));
}

export function mergeHelpArticlesWithPinFallback<TArticle extends HelpArticleLike>(
    articles: readonly TArticle[],
    fallbackArticles: readonly PinFallbackArticle[],
) {
    return [
        ...articles,
        ...fallbackArticles.filter((fallbackArticle) => {
            const fallbackTopic = PIN_TOPIC_BY_ID[fallbackArticle.id];
            const normalizedFallbackQuestion = normalizeText(fallbackArticle.question);

            return !articles.some((article) => {
                const normalizedArticleQuestion = normalizeText(article.question);
                if (normalizedArticleQuestion === normalizedFallbackQuestion) {
                    return true;
                }

                if (article.category !== fallbackArticle.category || !fallbackTopic) {
                    return false;
                }

                return matchesPinTopic(article, fallbackTopic);
            });
        }),
    ];
}
