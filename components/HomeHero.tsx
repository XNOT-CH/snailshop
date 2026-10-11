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

// A short band: site title on the left, the promo banner behind it on the
// right. The banner is pinned to the right screen edge and kept wide so it
// dominates the band; at this height that crops its bottom strip (logos and
// fine print). Its left edge fades out through a mask into the band colour
// behind the title. On phones a background crop would lose the banner's text,
// so there it sits above the title as a full-width strip at its own ratio,
// minus the same bottom strip.
export function HomeHero({ siteName, description }: Readonly<HomeHeroProps>) {
  return (
    <section
      id="home-hero"
      className="relative isolate flex flex-col bg-[var(--hero-band)] pb-8 shadow-[0_0_0_100vmax_var(--hero-band)] [--hero-band:var(--card)] dark:[--hero-band:#08203f] [clip-path:inset(0_-100vmax)] md:h-[360px] md:justify-center md:py-8"
    >
      {/* The banner reaches the screen edge, past the page container; clip the
          sideways overflow so it never adds a horizontal scrollbar. */}
      <style href="home-hero-clip" precedence="default">{"html:has(#home-hero){overflow-x:clip}"}</style>
      <div
        aria-hidden="true"
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 motion-safe:fill-mode-both relative -z-10 ml-[calc(50%-50vw)] aspect-[1683/575] w-screen md:absolute md:inset-y-0 md:right-[calc(50%-50vw)] md:ml-0 md:aspect-auto md:w-[min(100vw,1450px)] md:[mask-image:linear-gradient(to_right,transparent,black_35%)]"
      >
        <Image
          src="/home-hero-banner.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1450px"
          className="object-cover object-top md:object-[center_19%]"
        />
      </div>
      {/* Where the banner runs under the title (narrower desktops), fade it out
          behind the text: solid band colour to just past the title, then 12rem
          of fade. In dark mode the band is a deep shade of the banner's own blue,
          so the fade stays blue instead of turning a muddy grey. */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-[calc(50%-50vw)] -z-10 hidden w-[calc(50vw-50%+34rem)] md:block"
        style={{ background: "linear-gradient(to right, var(--hero-band) calc(100% - 12rem), transparent)" }}
      />
      <div className="mt-6 max-w-md md:mt-0">
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
