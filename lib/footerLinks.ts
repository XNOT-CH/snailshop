type FooterLinkLike = {
    id: string;
    href: string;
    label: string;
    openInNewTab: boolean;
};

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

function isRelativeHref(href: string) {
    return href.startsWith("/");
}

export function isUnsafePublicFooterHref(href: string) {
    const trimmedHref = href.trim();
    if (!trimmedHref) {
        return true;
    }

    if (isRelativeHref(trimmedHref)) {
        return false;
    }

    try {
        const parsed = new URL(trimmedHref);
        if (!["http:", "https:"].includes(parsed.protocol)) {
            return true;
        }

        return LOOPBACK_HOSTNAMES.has(parsed.hostname);
    } catch {
        return true;
    }
}

export function sanitizePublicFooterLinks<T extends FooterLinkLike>(links: T[]) {
    return links.filter((link) => !isUnsafePublicFooterHref(link.href));
}
