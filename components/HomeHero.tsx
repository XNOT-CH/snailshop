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

// The promo banner is the hero's backdrop and the site title sits in front of
// it. On desktop the band height is capped so the hero never fills the screen;
// the banner keeps its full height (nothing cropped), is pinned to the right
// screen edge, and a scrim in the theme's card colour fades only its left edge
// behind the title, leaving the character clear. On phones the banner fills the band and the scrim rises from the
// bottom instead. The band runs edge to edge by painting its background out
// with a spread shadow clipped to its own height.
export function HomeHero({ siteName, description }: Readonly<HomeHeroProps>) {
  return (
    <section
      id="home-hero"
      className="relative isolate flex min-h-[560px] flex-col justify-end bg-[var(--card)] py-8 shadow-[0_0_0_100vmax_var(--card)] [clip-path:inset(0_-100vmax)] md:min-h-[min(32vw,560px)] md:justify-center"
    >
      {/* The banner reaches the screen edge, past the page container; clip the
          sideways overflow so it never adds a horizontal scrollbar. */}
      <style href="home-hero-clip" precedence="default">{"html:has(#home-hero){overflow-x:clip}"}</style>
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 motion-safe:fill-mode-both absolute inset-y-0 right-[calc(50%-50vw)] -z-10 w-screen md:aspect-[1683/624] md:w-auto">
        <Image
          src="/home-hero-banner.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1512px"
          className="object-cover object-[46%_center]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-[var(--card)] from-35% via-[var(--card)]/80 via-55% to-transparent md:bg-linear-to-r md:from-10% md:via-[var(--card)]/80 md:via-22% md:to-38%"
        />
      </div>
      <div className="max-w-md">
        <p className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:fill-mode-both inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          ร้านขายไอดีเกม
        </p>
        <h1 className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:fill-mode-both motion-safe:delay-100 mt-5 text-4xl font-bold leading-tight text-foreground sm:text-6xl">{siteName}</h1>
        {description?.trim() && (
          <p className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:fill-mode-both motion-safe:delay-200 mt-4 text-base text-muted-foreground">{description.trim()}</p>
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
