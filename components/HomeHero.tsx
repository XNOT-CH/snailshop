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

// Follows the light/dark theme so the hero reads as one piece with the navbar
// above it. It runs edge to edge by painting its background out with a spread
// shadow clipped to its own height, so it never widens the page.
export function HomeHero({ siteName, description }: Readonly<HomeHeroProps>) {
  return (
    <section className="relative bg-[var(--card)] shadow-[0_0_0_100vmax_var(--card)] [clip-path:inset(0_-100vmax)]">
      <div className="grid items-center gap-8 py-10 sm:py-14 md:grid-cols-[1fr_auto] md:gap-12">
        <div className="min-w-0">
          <p className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:fill-mode-both inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            ร้านขายไอดีเกม
          </p>
          <h1 className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:fill-mode-both motion-safe:delay-100 mt-5 text-4xl font-bold leading-tight text-foreground sm:text-6xl">{siteName}</h1>
          {description?.trim() && (
            <p className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:fill-mode-both motion-safe:delay-200 mt-4 max-w-xl text-base text-muted-foreground">{description.trim()}</p>
          )}
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:fill-mode-both motion-safe:delay-300 mt-8 flex flex-wrap gap-3">
            <Link href="/shop" prefetch={false} className={cn(buttonVariants({ size: "lg" }), "rounded-xl px-6")}>
              ดูสินค้าทั้งหมด
              <ArrowRight />
            </Link>
            <Link href="/dashboard/topup" prefetch={false} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-xl px-6")}>
              {TOPUP_LABEL}
            </Link>
          </div>
        </div>
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-700 motion-safe:delay-200 motion-safe:fill-mode-both relative mx-auto w-52 sm:w-64 md:w-80">
          <div aria-hidden="true" className="absolute inset-[8%] rounded-full bg-primary/10" />
          <Image src="/home-mascot-transparent.webp" alt="" width={320} height={320} priority className="relative w-full motion-safe:animate-[float_4s_ease-in-out_infinite]" />
        </div>
      </div>
    </section>
  );
}
