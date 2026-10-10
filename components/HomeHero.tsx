import Image from "next/image";
import Link from "next/link";

interface HomeHeroProps {
  siteName: string;
  description?: string | null;
}

// A short band with the promo banner centred on it, like a storefront banner
// strip. The banner already carries its own headline and call to action, so the
// site name is a screen-reader-only h1. Behind it, a blurred, faded copy of the
// same banner fills the band edge to edge so the sides aren't bare.
export function HomeHero({ siteName, description }: Readonly<HomeHeroProps>) {
  return (
    <section
      id="home-hero"
      className="relative isolate bg-[var(--card)] py-5 shadow-[0_0_0_100vmax_var(--card)] [clip-path:inset(0_-100vmax)] sm:py-8"
    >
      {/* The backdrop reaches the screen edge, past the page container; clip the
          sideways overflow so it never adds a horizontal scrollbar. */}
      <style href="home-hero-clip" precedence="default">{"html:has(#home-hero){overflow-x:clip}"}</style>
      <div aria-hidden="true" className="absolute inset-y-0 left-[calc(50%-50vw)] -z-10 w-screen overflow-hidden">
        <Image src="/home-hero-banner.webp" alt="" fill sizes="10vw" className="scale-110 object-cover opacity-30 blur-2xl" />
      </div>
      <h1 className="sr-only">{siteName}</h1>
      <Link
        href="/shop"
        prefetch={false}
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-700 motion-safe:fill-mode-both mx-auto block max-w-3xl overflow-hidden rounded-2xl shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)] transition-[translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1"
      >
        <Image
          src="/home-hero-banner.webp"
          alt={`${siteName} Level Up ใช้โค้ด DKE1246`}
          width={1683}
          height={624}
          priority
          sizes="(max-width: 768px) 100vw, 768px"
          className="h-auto w-full"
        />
      </Link>
      {description?.trim() && (
        <p className="mx-auto mt-5 max-w-3xl text-center text-base text-muted-foreground">{description.trim()}</p>
      )}
    </section>
  );
}
