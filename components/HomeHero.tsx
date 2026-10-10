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
// It runs edge to edge by painting its background out with a spread shadow
// clipped to its own height, so it never widens the page or adds a scrollbar.
export function HomeHero({ siteName, description, stats }: Readonly<HomeHeroProps>) {
  const statItems = [
    { icon: Package, value: stats.availableProducts, label: "สินค้าพร้อมขาย" },
    { icon: ShoppingBag, value: stats.completedOrders, label: "รายการที่ขายแล้ว" },
    { icon: Users, value: stats.members, label: "สมาชิก" },
  ];

  return (
    <section className="relative bg-[#0a0e14] text-[#f5f7fa] shadow-[0_0_0_100vmax_#0a0e14] [clip-path:inset(0_-100vmax)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_48%,rgba(88,166,255,0.10)_48%,rgba(88,166,255,0.10)_62%,transparent_62%,transparent_69%,rgba(88,166,255,0.06)_69%,rgba(88,166,255,0.06)_75%,transparent_75%)]" />

      <div className="relative grid items-center gap-6 pb-8 pt-10 sm:pt-14 md:grid-cols-[1fr_auto] md:gap-10 md:pb-10">
        <div className="min-w-0">
          <h1 className="text-4xl font-bold leading-tight sm:text-6xl">
            {siteName}
            <span className="block">ร้านขายไอดีเกม</span>
          </h1>
          {description?.trim() && (
            <p className="mt-5 max-w-xl text-base text-[#9ca3af]">{description.trim()}</p>
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
        <div className="relative mx-auto w-56 sm:w-72 md:w-96">
          <div aria-hidden="true" className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(88,166,255,0.28)_0%,transparent_68%)]" />
          <Image src="/home-mascot-transparent.webp" alt="" width={384} height={384} priority className="relative w-full" />
        </div>
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
