import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Package, ShoppingBag, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TOPUP_LABEL } from "@/lib/navigation";

export interface HomeHeroStats {
  availableProducts: number;
  completedOrders: number;
  members: number;
}

interface HomeHeroProps {
  siteName: string;
  description?: string | null;
  stats: HomeHeroStats;
}

// The hero stays dark in both themes, as in the brand guide: it is the one
// place the page carries the brand look rather than following light/dark.
export function HomeHero({ siteName, description, stats }: Readonly<HomeHeroProps>) {
  const statItems = [
    { icon: Package, value: stats.availableProducts, label: "สินค้าพร้อมขาย" },
    { icon: ShoppingBag, value: stats.completedOrders, label: "รายการที่ขายแล้ว" },
    { icon: Users, value: stats.members, label: "สมาชิก" },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0e14] text-[#f5f7fa]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_52%,rgba(88,166,255,0.10)_52%,rgba(88,166,255,0.10)_64%,transparent_64%,transparent_70%,rgba(88,166,255,0.06)_70%,rgba(88,166,255,0.06)_76%,transparent_76%)]" />

      <div className="relative grid items-center gap-8 px-6 py-10 sm:px-10 sm:py-14 md:grid-cols-[1fr_auto] md:gap-12">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#58a6ff]">ร้านขายไอดีเกม</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-6xl">{siteName}</h1>
          {description?.trim() && (
            <p className="mt-4 max-w-xl text-base text-[#9ca3af]">{description.trim()}</p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/shop"
              prefetch={false}
              className={cn(buttonVariants({ size: "lg" }), "rounded-xl bg-[#58a6ff] px-6 text-[#0a0e14] hover:bg-[#7cc3ff]")}
            >
              ดูสินค้าทั้งหมด
              <ArrowRight />
            </Link>
            <Link
              href="/dashboard/topup"
              prefetch={false}
              className={cn(buttonVariants({ size: "lg" }), "rounded-xl border border-white/25 bg-transparent px-6 text-[#f5f7fa] hover:bg-white/10")}
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
      </div>

      <div className="relative grid grid-cols-3 border-t border-white/10">
        {statItems.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex flex-col items-center gap-1 px-2 py-5 text-center sm:flex-row sm:justify-center sm:gap-3 sm:text-left [&:not(:first-child)]:border-l [&:not(:first-child)]:border-white/10">
            <Icon className="h-5 w-5 shrink-0 text-[#58a6ff] sm:h-6 sm:w-6" aria-hidden="true" />
            <div>
              <p className="text-xl font-bold sm:text-2xl">{value.toLocaleString("th-TH")}</p>
              <p className="text-xs text-[#9ca3af] sm:text-sm">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
