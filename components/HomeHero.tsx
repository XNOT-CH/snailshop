import type { HeroBannerItem } from "@/components/HeroBanner";
import { HomeHeroCarousel } from "@/components/HomeHeroCarousel";

interface HomeHeroProps {
  siteName: string;
  banners: HeroBannerItem[];
}

// The admin's banners as a peeking carousel across a near-black band in both
// themes, in the style of game top-up storefronts: no title block, the banners
// carry the message.
// The site name stays as the page's h1 for screen readers and search engines.
export function HomeHero({ siteName, banners }: Readonly<HomeHeroProps>) {
  return (
    <section
      id="home-hero"
      className="relative isolate bg-[var(--hero-band)] py-3 shadow-[0_0_0_100vmax_var(--hero-band)] [--hero-band:#0a0e14] [clip-path:inset(0_-100vmax)] md:py-4"
    >
      {/* The carousel reaches the screen edges, past the page container; clip
          the sideways overflow so it never adds a scrollbar. */}
      <style href="home-hero-clip" precedence="default">{"html:has(#home-hero){overflow-x:clip}"}</style>
      <h1 className="sr-only">{siteName}</h1>
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 motion-safe:fill-mode-both">
        <HomeHeroCarousel banners={banners} />
      </div>
    </section>
  );
}
