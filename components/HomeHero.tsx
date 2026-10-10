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
// it. A scrim in the theme's card colour fades in from the text side (left on
// desktop, bottom on phones) so the title stays readable in both themes while
// the character and headline on the banner's right stay visible.
export function HomeHero({ siteName, description }: Readonly<HomeHeroProps>) {
  return (
    <section className="relative bg-[var(--card)] py-6 shadow-[0_0_0_100vmax_var(--card)] [clip-path:inset(0_-100vmax)] sm:py-10">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 motion-safe:fill-mode-both relative isolate flex min-h-[520px] flex-col justify-end overflow-hidden rounded-2xl p-6 sm:p-10 md:min-h-[440px] md:justify-center md:p-14">
        <Image
          src="/home-hero-banner.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="-z-20 object-cover object-[46%_center] md:object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-linear-to-t from-[var(--card)] from-35% via-[var(--card)]/80 via-55% to-transparent md:bg-linear-to-r md:from-38% md:via-[var(--card)]/85 md:via-52% md:to-68%"
        />
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
      </div>
    </section>
  );
}
