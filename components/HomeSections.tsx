import Link from "next/link";
import type { ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, ChevronDown, Dices, ListChecks, PackageCheck, ShoppingCart, Wallet } from "lucide-react";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { ThumbImage } from "@/components/ThumbImage";
import { formatCurrencyAmount, type PublicCurrencySettings } from "@/lib/currencySettings";
import { getGachaCostLabel, normalizeGachaCost } from "@/lib/gachaCost";
import { TOPUP_LABEL } from "@/lib/navigation";
import { themeClasses } from "@/lib/theme";

export function HomeSectionHeading({
  title,
  subtitle,
  action,
}: Readonly<{ title: string; subtitle?: string; action?: ReactNode }>) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold leading-tight text-foreground sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function HomeSeeAllLink({ href }: Readonly<{ href: string }>) {
  return (
    <Link href={href} prefetch={false} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
      ดูทั้งหมด
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

export function HomeGameChips({ games }: Readonly<{ games: { name: string }[] }>) {
  return (
    <div className="flex flex-wrap gap-2">
      {games.map((game) => (
        <Link
          key={game.name}
          href={`/shop?category=${encodeURIComponent(game.name)}`}
          prefetch={false}
          className="inline-flex h-10 items-center rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {game.name}
        </Link>
      ))}
    </div>
  );
}

export interface HomeProductTileData {
  id: string;
  name: string;
  price: number;
  discountPrice: number | null;
  currency: string | null;
  imageUrl: string | null;
  category: string;
}

// Horizontal content card from the brand guide: image, tag, title, price, arrow.
export function HomeProductTile({
  product,
  currencySettings,
}: Readonly<{ product: HomeProductTileData; currencySettings?: PublicCurrencySettings }>) {
  const hasDiscount = product.discountPrice !== null && product.discountPrice < product.price;
  const activePrice = hasDiscount && product.discountPrice !== null ? product.discountPrice : product.price;

  return (
    <Link
      href={`/product/${product.id}`}
      prefetch={false}
      className="group flex items-center gap-4 rounded-xl border border-border bg-[var(--card)] p-3 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/50"
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-24">
        <ThumbImage src={product.imageUrl || "/placeholder.jpg"} alt={product.name} fill sizes="96px" loading="lazy" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="inline-block max-w-full truncate rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {product.category}
        </span>
        <h3 className="mt-1.5 truncate text-sm font-semibold text-foreground sm:text-base">{product.name}</h3>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
          <span className={`font-bold ${hasDiscount ? themeClasses.saleText : "text-foreground"}`}>
            {formatCurrencyAmount(activePrice, product.currency, currencySettings)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              {formatCurrencyAmount(product.price, product.currency, currencySettings)}
            </span>
          )}
        </div>
      </div>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export interface HomeGachaMachine {
  id: string;
  name: string;
  imageUrl: string | null;
  gameType: string;
  costType: string;
  costAmount: number;
}

export function HomeGachaMachines({
  machines,
  currencySettings,
}: Readonly<{ machines: HomeGachaMachine[]; currencySettings?: PublicCurrencySettings }>) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {machines.map((machine, index) => {
        const cost = normalizeGachaCost(machine.costType, machine.costAmount);
        const costText = cost.costType === "FREE"
          ? "เล่นฟรี"
          : `ครั้งละ ${cost.costAmount.toLocaleString("th-TH")} ${getGachaCostLabel(cost.costType, currencySettings)}`;
        // Same routing as the gacha hub: grid machines have their own page.
        const href = machine.gameType === "GRID_3X3" ? `/gacha-grid/${machine.id}` : `/gacha/${machine.id}`;

        return (
          <RevealOnScroll key={machine.id} index={index}>
          <Link href={href} prefetch={false} className="group block">
            <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
              {machine.imageUrl ? (
                <Image
                  src={machine.imageUrl}
                  alt={machine.name}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  loading="lazy"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Dices className="h-10 w-10" />
                </div>
              )}
            </div>
            <h3 className="mt-3 truncate font-semibold text-foreground group-hover:text-primary">{machine.name}</h3>
            <p className="text-sm text-muted-foreground">{costText}</p>
          </Link>
          </RevealOnScroll>
        );
      })}
    </div>
  );
}

// The brand guide's "Brand values" panel, used for the buying steps: heading
// on the left, numbered steps on the right. Steps follow the real flow —
// credit is spent at checkout and purchases land in the inventory page.
export function HomeHowToBuy() {
  const steps = [
    { icon: Wallet, title: TOPUP_LABEL, text: "เติมเครดิตเข้าบัญชีของคุณ" },
    { icon: ShoppingCart, title: "เลือกสินค้า", text: "เลือกไอดีหรือไอเทมที่ต้องการ แล้วชำระด้วยเครดิต" },
    { icon: PackageCheck, title: "รับสินค้า", text: "ข้อมูลสินค้าอยู่ในหน้าคลังสินค้าของฉัน" },
  ];

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12">
      <div>
        <p className="text-sm font-semibold text-primary">วิธีสั่งซื้อ</p>
        <h2 className="mt-2 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          ซื้อง่าย
          <span className="block">ใน 3 ขั้นตอน</span>
        </h2>
        <Link
          href="/help"
          prefetch={false}
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          ศูนย์ช่วยเหลือ
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <ol className="divide-y divide-border border-y border-border">
        {steps.map(({ icon: Icon, title, text }, index) => (
          <li key={title} className="flex items-center gap-4 py-5">
            <Icon className="h-6 w-6 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground">
                <span className="mr-2 text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                {title}
              </p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Closing band, after the guide's last panel. Guests only — members are already in.
export function HomeJoinCta({ siteName }: Readonly<{ siteName: string }>) {
  return (
    <section className="flex flex-col items-start justify-between gap-6 rounded-xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 md:flex-row md:items-center">
      <div>
        <h2 className="text-2xl font-bold sm:text-3xl">สมัครสมาชิก {siteName}</h2>
        <p className="mt-2 flex items-center gap-2 text-sm opacity-90">
          <ListChecks className="h-4 w-4 shrink-0" />
          สมาชิกซื้อสินค้า ทำภารกิจรายวัน และสะสมรางวัลได้
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/register"
          prefetch={false}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-foreground px-6 text-sm font-semibold text-primary transition-opacity hover:opacity-90"
        >
          สมัครสมาชิก
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/login"
          prefetch={false}
          className="inline-flex h-11 items-center rounded-xl border border-primary-foreground/40 px-6 text-sm font-semibold transition-colors hover:bg-primary-foreground/10"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    </section>
  );
}

// Same two-column layout as the buying steps; answers come from the help
// center's own articles, so the home page never says anything the help page
// does not.
export function HomeFaq({ articles }: Readonly<{ articles: { id: string; question: string; answer: string }[] }>) {
  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12">
      <div>
        <p className="text-sm font-semibold text-primary">ช่วยเหลือ</p>
        <h2 className="mt-2 text-3xl font-bold leading-tight text-foreground sm:text-4xl">คำถามที่พบบ่อย</h2>
        <Link href="/help" prefetch={false} className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          ดูคำถามทั้งหมด
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {articles.map((article) => (
          <details key={article.id} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              {article.question}
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{article.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
