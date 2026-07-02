import { permanentRedirect } from "next/navigation";

// Force runtime execution so the redirect is a real HTTP 308 — statically
// prerendered redirects get served as an HTTP 200 page with a meta refresh,
// which is a weaker signal for crawlers.
export const dynamic = "force-dynamic";

/**
 * The homepage now lives at "/" (it used to be here, behind a cookie redirect
 * on the root — which made crawlers index the /welcome splash as the homepage).
 * Kept as a permanent redirect because old links, bookmarks, and the nav items
 * stored in the database still point at /home.
 */
export default function LegacyHomePage() {
  permanentRedirect("/");
}
