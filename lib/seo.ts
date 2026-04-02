import type { Metadata } from "next";

export const SITE_NAME = "Manashop";
export const SITE_TITLE = `${SITE_NAME} - Game ID Marketplace`;
export const DEFAULT_SITE_DESCRIPTION = "แหล่งซื้อขายไอดีเกมและไอเทมเกมที่ปลอดภัย ใช้งานง่าย และค้นหาสินค้าได้รวดเร็ว";
export const SITE_LOCALE = "th_TH";

function ensureAbsoluteUrl(value: string): string {
    if (value.startsWith("http://") || value.startsWith("https://")) {
        return value;
    }

    return `https://${value}`;
}

export function getBaseUrl(): string {
    const rawValue =
        process.env.NEXT_PUBLIC_SITE_URL ??
        process.env.AUTH_URL ??
        process.env.VERCEL_PROJECT_PRODUCTION_URL ??
        process.env.VERCEL_URL ??
        "http://localhost:3000";

    return ensureAbsoluteUrl(rawValue).replace(/\/+$/, "");
}

export function absoluteUrl(path = "/"): string {
    return new URL(path, `${getBaseUrl()}/`).toString();
}

export function toAbsoluteAssetUrl(assetUrl?: string | null): string | undefined {
    if (!assetUrl) return undefined;
    if (assetUrl.startsWith("data:")) return assetUrl;

    return assetUrl.startsWith("http://") || assetUrl.startsWith("https://")
        ? assetUrl
        : absoluteUrl(assetUrl.startsWith("/") ? assetUrl : `/${assetUrl}`);
}

type PageMetadataOptions = {
    title?: string;
    description?: string;
    path?: string;
    image?: string | null;
    noIndex?: boolean;
    type?: "website" | "article";
};

export function buildPageMetadata({
    title,
    description = DEFAULT_SITE_DESCRIPTION,
    path = "/",
    image,
    noIndex = false,
    type = "website",
}: PageMetadataOptions): Metadata {
    const imageUrl = toAbsoluteAssetUrl(image);
    const canonicalUrl = absoluteUrl(path);
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_TITLE;

    return {
        title,
        description,
        alternates: {
            canonical: path,
        },
        openGraph: {
            title: fullTitle,
            description,
            url: canonicalUrl,
            siteName: SITE_NAME,
            locale: SITE_LOCALE,
            type,
            ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
        },
        twitter: {
            card: imageUrl ? "summary_large_image" : "summary",
            title: fullTitle,
            description,
            ...(imageUrl ? { images: [imageUrl] } : {}),
        },
        ...(noIndex
            ? {
                robots: {
                    index: false,
                    follow: false,
                    nocache: true,
                    googleBot: {
                        index: false,
                        follow: false,
                        noimageindex: true,
                    },
                },
            }
            : {}),
    };
}
