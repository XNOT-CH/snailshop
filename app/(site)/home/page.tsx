import { permanentRedirect } from "next/navigation";

/**
 * The homepage now lives at "/" (it used to be here, behind a cookie redirect
 * on the root — which made crawlers index the /welcome splash as the homepage).
 * Kept as a permanent redirect because old links, bookmarks, and the nav items
 * stored in the database still point at /home.
 */
export default function LegacyHomePage() {
  permanentRedirect("/");
}
