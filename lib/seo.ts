import type { Metadata } from "next";

export const SITE_NAME = "SNAILSHOP";
export const SITE_TITLE = `${SITE_NAME} - Game ID Marketplace`;
export const DEFAULT_SITE_DESCRIPTION = "Trusted marketplace for game accounts and in-game items.";
export const SITE_LOCALE = "th_TH";
export const DEFAULT_OG_IMAGE_PATH = "/opengraph-image";

const isProduction = process.env.NODE_ENV === "production";

function ensureAbsoluteUrl(value: string): string {
    if (value.startsWith("http://") || value.startsWith("https://")) {
        return value;
    }

    return `https://${value}`;
}

export function getBaseUrl(): string {
    const rawValue =
        process.env.NEXT_PUBLIC_SITE_URL ??
        process.env.VERCEL_PROJECT_PRODUCTION_URL ??
        process.env.VERCEL_URL ??
        process.env.AUTH_URL ??
        "http://localhost:3000";

    const normalized = ensureAbsoluteUrl(rawValue).replace(/\/+$/, "");

    if (isProduction && normalized === "http://localhost:3000") {
        return "https://localhost.invalid";
    }

    return normalized;
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

export function resolveSiteName(siteName?: string | null): string {
    const normalized = siteName?.trim();
    return normalized || SITE_NAME;
}

type PageMetadataOptions = {
    title?: string;
    description?: string;
    path?: string;
    image?: string | null;
    noIndex?: boolean;
    type?: "website" | "article";
    siteName?: string | null;
};

export function buildPageMetadata({
    title,
    description = DEFAULT_SITE_DESCRIPTION,
    path = "/",
    image,
    noIndex = false,
    type = "website",
    siteName,
}: PageMetadataOptions): Metadata {
    const imageUrl = toAbsoluteAssetUrl(image) ?? absoluteUrl(DEFAULT_OG_IMAGE_PATH);
    const canonicalUrl = absoluteUrl(path);
    const resolvedSiteName = resolveSiteName(siteName);
    const fullTitle = title ? `${title} | ${resolvedSiteName}` : `${resolvedSiteName} - Game ID Marketplace`;

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
            siteName: resolvedSiteName,
            locale: SITE_LOCALE,
            type,
            images: [{ url: imageUrl }],
        },
        twitter: {
            card: "summary_large_image",
            title: fullTitle,
            description,
            images: [imageUrl],
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
