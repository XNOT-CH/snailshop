import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TOPUP_LABEL } from "@/lib/navigation";

interface HomeHeroProps {
  siteName: string;
  description?: string | null;
}

// A short band: site title on the left, the promo banner beside it on the
// right as a whole 2:1 picture. Nothing is cropped or faded, so every tablet
// and desktop width shows the same banner, only scaled — a banner designed at
// 2:1 (e.g. 1600×800) can be laid out once for all of them. On phones it sits
// above the title as a full-width strip at its own ratio, minus the bottom
// strip (logos and fine print).
export function HomeHero({ siteName, description }: Readonly<HomeHeroProps>) {
  return (
    <section
      id="home-hero"
      className="relative isolate flex flex-col bg-[var(--hero-band)] pb-8 shadow-[0_0_0_100vmax_var(--hero-band)] [--hero-band:var(--card)] dark:[--hero-band:#08203f] [clip-path:inset(0_-100vmax)] md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center md:gap-10 md:py-8"
    >
      {/* On phones the banner reaches the screen edges, past the page
          container; clip the sideways overflow so it never adds a scrollbar. */}
      <style href="home-hero-clip" precedence="default">{"html:has(#home-hero){overflow-x:clip}"}</style>
      <div
        aria-hidden="true"
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 motion-safe:fill-mode-both relative ml-[calc(50%-50vw)] aspect-[1683/575] w-screen overflow-hidden md:col-start-2 md:row-start-1 md:ml-0 md:aspect-[2/1] md:w-full md:rounded-2xl"
      >
        <Image
          src="/home-hero-banner.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 60vw"
          className="object-cover object-top md:object-right"
        />
      </div>
      <div className="mt-6 max-w-md md:col-start-1 md:row-start-1 md:mt-0">
        <p className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:fill-mode-both text-sm font-semibold text-primary">
          ร้านขายไอดีเกม
        </p>
        <h1 className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:fill-mode-both motion-safe:delay-100 mt-2 text-4xl font-bold leading-tight text-foreground sm:text-6xl md:text-5xl lg:text-6xl">{siteName}</h1>
        {description?.trim() && (
          <p className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:fill-mode-both motion-safe:delay-200 mt-4 text-pretty text-base text-muted-foreground">{description.trim()}</p>
        )}
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:fill-mode-both motion-safe:delay-300 mt-8 flex flex-wrap gap-3">
          <Link href="/shop" prefetch={false} className={cn(buttonVariants({ size: "lg" }), "rounded-xl px-6 duration-300 ease-out")}>
            ดูสินค้าทั้งหมด
            <ArrowRight />
          </Link>
          <Link href="/dashboard/topup" prefetch={false} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-xl px-6 duration-300 ease-out")}>
            {TOPUP_LABEL}
          </Link>
        </div>
      </div>
    </section>
  );
}
