"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { WELCOME_SEEN_COOKIE } from "@/lib/welcomeCookie";

/**
 * Sends first-time visitors from the homepage to the /welcome splash.
 *
 * This runs client-side on purpose: the homepage must be served to crawlers
 * as real content (a server-side cookie redirect made Google index the
 * welcome splash as the homepage). The welcome page sets the seen-cookie
 * (see WelcomeSeenMarker), so this fires at most once per day per visitor.
 */
export function WelcomeRedirect() {
    const router = useRouter();

    useEffect(() => {
        const seen = document.cookie
            .split("; ")
            .some((cookie) => cookie.startsWith(`${WELCOME_SEEN_COOKIE}=`));

        if (!seen) {
            router.replace("/welcome");
        }
    }, [router]);

    return null;
}
