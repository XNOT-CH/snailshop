import Image from "next/image";
import Link from "next/link";

interface HomeHeroProps {
  siteName: string;
  description?: string | null;
}

// The promo banner is the hero: it already carries its own headline and call
// to action, so the site name stays as a screen-reader-only h1 rather than a
// second visible title competing with it. The band follows the light/dark
// theme and runs edge to edge by painting its background out with a spread
// shadow clipped to its own height, so it never widens the page.
export function HomeHero({ siteName, description }: Readonly<HomeHeroProps>) {
  return (
    <section className="relative bg-[var(--card)] py-6 shadow-[0_0_0_100vmax_var(--card)] [clip-path:inset(0_-100vmax)] sm:py-10">
      <h1 className="sr-only">{siteName}</h1>
      <Link
        href="/shop"
        prefetch={false}
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-700 motion-safe:fill-mode-both block overflow-hidden rounded-2xl transition-[translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1"
      >
        <Image
          src="/home-hero-banner.webp"
          alt={`${siteName} Level Up ใช้โค้ด DKE1246`}
          width={1683}
          height={624}
          priority
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="h-auto w-full"
        />
      </Link>
      {description?.trim() && (
        <p className="mt-6 max-w-2xl text-base text-muted-foreground">{description.trim()}</p>
      )}
    </section>
  );
}
