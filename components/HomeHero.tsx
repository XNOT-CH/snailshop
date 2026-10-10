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
// right. The banner keeps its full height (nothing cropped) pinned to the right
// screen edge, and its left edge fades out through a mask into a blurred copy
// of itself that fills the rest of the band, so the title sits on soft colour
// rather than bare space. On phones the banner fills the band and fades towards
// the title at the bottom instead.
export function HomeHero({ siteName, description }: Readonly<HomeHeroProps>) {
  return (
    <section
      id="home-hero"
      className="relative isolate flex min-h-[440px] flex-col justify-end bg-[var(--card)] py-8 shadow-[0_0_0_100vmax_var(--card)] [clip-path:inset(0_-100vmax)] md:h-[360px] md:min-h-0 md:justify-center"
    >
      {/* The banner reaches the screen edge, past the page container; clip the
          sideways overflow so it never adds a horizontal scrollbar. */}
      <style href="home-hero-clip" precedence="default">{"html:has(#home-hero){overflow-x:clip}"}</style>
      <div aria-hidden="true" className="absolute inset-y-0 left-[calc(50%-50vw)] -z-20 w-screen overflow-hidden">
        <Image src="/home-hero-banner.webp" alt="" fill sizes="10vw" className="scale-110 object-cover opacity-30 blur-2xl" />
      </div>
      <div
        aria-hidden="true"
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 motion-safe:fill-mode-both absolute inset-y-0 right-[calc(50%-50vw)] -z-10 w-screen [mask-image:linear-gradient(to_top,transparent_30%,black_65%)] md:aspect-[1683/624] md:w-auto md:[mask-image:linear-gradient(to_right,transparent,black_35%)]"
      >
        <Image
          src="/home-hero-banner.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 980px"
          className="object-cover object-[46%_center]"
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
