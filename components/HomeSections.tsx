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

// A full-width band in one of the two page tones. The color is painted past the
// content column with a spread shadow clipped to the band's height, so it spans
// the screen without widening the page. "raised" matches the hero.
export function HomeBand({
  tone,
  className = "",
  children,
}: Readonly<{ tone: "plain" | "raised"; className?: string; children: ReactNode }>) {
  const color = tone === "raised" ? "var(--card)" : "var(--background)";
  return (
    <div
      className={`py-14 lg:py-24 ${className}`}
      style={{ backgroundColor: color, boxShadow: `0 0 0 100vmax ${color}`, clipPath: "inset(0 -100vmax)" }}
    >
      {children}
    </div>
  );
}

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
          className="inline-flex h-10 items-center rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors duration-300 ease-out hover:border-primary hover:text-primary"
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
      className="group flex items-center gap-4 rounded-xl border border-border bg-[var(--card)] p-3 transition-[border-color,translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-primary/50"
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
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors duration-300 ease-out group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
        <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5" />
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
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Dices className="h-10 w-10" />
                </div>
              )}
            </div>
            <h3 className="mt-3 truncate font-semibold text-foreground transition-colors duration-300 ease-out group-hover:text-primary">{machine.name}</h3>
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
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-foreground px-6 text-sm font-semibold text-primary transition-opacity duration-300 ease-out hover:opacity-90"
        >
          สมัครสมาชิก
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/login"
          prefetch={false}
          className="inline-flex h-11 items-center rounded-xl border border-primary-foreground/40 px-6 text-sm font-semibold transition-colors duration-300 ease-out hover:bg-primary-foreground/10"
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
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-open:rotate-180" />
            </summary>
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{article.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

// Interactive art: at rest the phone artwork floats on the band; on hover it
// tips back in 3D and the viking rises out over its top. Touch screens have no
// hover, so there the viking rests half-risen instead. Both links go to the
// shop for now — there is no separate game top-up page.
export function HomeTopupShowcase() {
  const ease = "ease-[cubic-bezier(0.22,1,0.36,1)]";

  return (
    <section className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
      <div className="group relative mx-auto w-full max-w-sm pt-16 [perspective:1200px]">
        <div
          className={`relative aspect-[2/3] origin-bottom transition-transform duration-700 ${ease} motion-safe:group-hover:[transform:rotateX(14deg)]`}
        >
          <Image
            src="/home-topup-phone-cutout.webp"
            alt=""
            fill
            sizes="(max-width: 768px) 90vw, 384px"
            loading="lazy"
            className={`object-contain transition-[opacity,scale] duration-700 ${ease} group-hover:scale-95 group-hover:opacity-60`}
          />
        </div>
        <Image
          src="/home-topup-viking.webp"
          alt=""
          width={800}
          height={729}
          loading="lazy"
          className={`pointer-events-none absolute bottom-[14%] left-1/2 w-[92%] -translate-x-1/2 drop-shadow-[0_16px_24px_rgba(0,0,0,0.45)] transition-[opacity,translate,scale] duration-700 ${ease} translate-y-[10%] scale-90 opacity-0 group-hover:-translate-y-[45%] group-hover:scale-100 group-hover:opacity-100 [@media(hover:none)]:-translate-y-[25%] [@media(hover:none)]:opacity-100`}
        />
      </div>

      <div>
        <p className="text-sm font-semibold text-primary">เติมเกมออนไลน์</p>
        <h2 className="mt-2 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          เติมเกม
          <span className="block">และไอเทมเกม</span>
        </h2>
        <p className="mt-4 max-w-md text-base text-muted-foreground">
          เลือกเกมที่ต้องการ แล้วชำระด้วยเครดิตในบัญชีของคุณ
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/shop"
            prefetch={false}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity duration-300 ease-out hover:opacity-90"
          >
            เติมเกม
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/shop"
            prefetch={false}
            className="inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-semibold text-foreground transition-colors duration-300 ease-out hover:border-primary hover:text-primary"
          >
            ไอเทมเกม
          </Link>
        </div>
      </div>
    </section>
  );
}
