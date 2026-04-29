import { describe, expect, it } from "vitest";
import { mergeHelpArticlesWithPinFallback } from "@/lib/helpArticles";

const pinFallbackArticles = [
    {
        id: "pin-faq-setup",
        question: "PIN คืออะไร และใช้ทำอะไร?",
        answer: "PIN ใช้ยืนยันรายการสำคัญ",
        category: "security",
        sortOrder: 900,
        isActive: true,
    },
    {
        id: "pin-faq-reset",
        question: "ถ้าลืม PIN ต้องทำอย่างไร?",
        answer: "รีเซ็ต PIN ได้จากโปรไฟล์",
        category: "security",
        sortOrder: 901,
        isActive: true,
    },
] as const;

describe("mergeHelpArticlesWithPinFallback", () => {
    it("keeps fallback articles when no custom PIN FAQ exists", () => {
        const result = mergeHelpArticlesWithPinFallback([], pinFallbackArticles);
        expect(result).toHaveLength(2);
    });

    it("removes fallback article when a custom article covers the same PIN topic", () => {
        const articles = [
            {
                question: "PIN เอาไว้ใช้ทำอะไรบ้าง",
                answer: "PIN คือรหัสที่ใช้ยืนยันรายการสำคัญก่อนซื้อสินค้า",
                category: "security",
            },
        ];

        const result = mergeHelpArticlesWithPinFallback(articles, pinFallbackArticles);

        expect(result).toHaveLength(2);
        expect(result.filter((article) => article.question.includes("PIN"))).toHaveLength(2);
        expect(result.some((article) => article.question === "PIN คืออะไร และใช้ทำอะไร?")).toBe(false);
    });

    it("removes fallback article when the question matches after normalization", () => {
        const articles = [
            {
                question: "ถ้าลืม PIN ต้องทำอย่างไร",
                answer: "รีเซ็ตได้",
                category: "security",
            },
        ];

        const result = mergeHelpArticlesWithPinFallback(articles, pinFallbackArticles);

        expect(result.some((article) => article.question === "ถ้าลืม PIN ต้องทำอย่างไร?")).toBe(false);
    });
});
