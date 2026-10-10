import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { TOPUP_LABEL } from "@/lib/navigation";
import { themeClasses } from "@/lib/theme";

interface HomeHeroProps {
  siteName: string;
  description?: string | null;
}

export function HomeHero({ siteName, description }: Readonly<HomeHeroProps>) {
  return (
    <section className={`${themeClasses.surface} grid items-center gap-6 overflow-hidden rounded-2xl p-6 sm:p-10 md:grid-cols-[1fr_auto] md:gap-10`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-primary">ร้านขายไอดีเกม</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-foreground sm:text-5xl">{siteName}</h1>
        {description?.trim() && (
          <p className="mt-4 max-w-xl text-base text-muted-foreground">{description.trim()}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/shop" prefetch={false} className={buttonVariants({ size: "lg", className: "rounded-xl px-6" })}>
            ดูสินค้าทั้งหมด
            <ArrowRight />
          </Link>
          <Link
            href="/dashboard/topup"
            prefetch={false}
            className={buttonVariants({ variant: "outline", size: "lg", className: "rounded-xl px-6" })}
          >
            {TOPUP_LABEL}
          </Link>
        </div>
      </div>
      <Image
        src="/home-mascot.webp"
        alt=""
        width={320}
        height={320}
        priority
        className="mx-auto w-48 rounded-3xl sm:w-64 md:w-80"
      />
    </section>
  );
}
