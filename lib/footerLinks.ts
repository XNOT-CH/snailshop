import { isSafePublicUrl, normalizeSafeUrlInput } from "@/lib/sanitize";

type FooterLinkLike = {
    id: string;
    href: string;
    label: string;
    openInNewTab: boolean;
};

export function isUnsafePublicFooterHref(href: string) {
    return !isSafePublicUrl(href);
}

export function sanitizePublicFooterLinks<T extends FooterLinkLike>(links: T[]) {
    return links
        .map((link) => ({ ...link, href: normalizeSafeUrlInput(link.href) }))
        .filter((link) => !isUnsafePublicFooterHref(link.href));
}
