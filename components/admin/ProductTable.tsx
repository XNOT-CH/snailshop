"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrencySettings } from "@/hooks/useCurrencySettings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { showConfirm, showError, showSuccess } from "@/lib/swal";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Gem,
  LayoutGrid,
  MoreHorizontal,
  Package,
  Pencil,
  Search,
  Star,
  Timer,
  Trash2,
} from "lucide-react";
import { formatCurrencyAmount } from "@/lib/currencySettings";

interface Product {
  id: string | number;
  name: string;
  description?: string | null;
  price: number;
  discountPrice?: number | null;
  imageUrl: string | null;
  category: string | null;
  isFeatured: boolean;
  isSold: boolean;
  stockCount?: number | null;
  autoDeleteAfterSale?: number | null;
  currency?: "THB" | "POINT" | null;
}

interface ProductTableProps {
  products: Product[];
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50] as const;

const LOW_STOCK_THRESHOLD = 5;

type SortKey = "default" | "name" | "price" | "stock";
type SortDir = "asc" | "desc";
type StockTone = "ok" | "low" | "out";

const MOBILE_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "default", label: "ใหม่ล่าสุด" },
  { value: "price-asc", label: "ราคาต่ำ → สูง" },
  { value: "price-desc", label: "ราคาสูง → ต่ำ" },
  { value: "stock-asc", label: "สต็อกน้อย → มาก" },
  { value: "stock-desc", label: "สต็อกมาก → น้อย" },
  { value: "name-asc", label: "ชื่อ ก → ฮ" },
];

interface ProductCardData {
  activePrice: number;
  autoDeleteLabel: string | null;
  displayStockCount: number;
  hasDiscount: boolean;
  isPointProduct: boolean;
  stockTone: StockTone;
}

function formatAutoDelete(minutes?: number | null) {
  if (!minutes || minutes <= 0) {
    return null;
  }

  if (minutes % 10080 === 0) {
    return `${minutes / 10080} สัปดาห์`;
  }

  if (minutes % 1440 === 0) {
    return `${minutes / 1440} วัน`;
  }

  if (minutes % 60 === 0) {
    return `${minutes / 60} ชั่วโมง`;
  }

  return `${minutes} นาที`;
}

function hasDiscountPrice(product: Product) {
  return (
    product.discountPrice !== null &&
    product.discountPrice !== undefined &&
    product.discountPrice < product.price
  );
}

function getActivePrice(product: Product) {
  return hasDiscountPrice(product) ? (product.discountPrice ?? product.price) : product.price;
}

function getDisplayStockCount(product: Product) {
  return product.stockCount ?? (product.isSold ? 0 : 1);
}

function getStockTone(stock: number, isSold: boolean): StockTone {
  if (isSold) {
    return "ok";
  }

  if (stock <= 0) {
    return "out";
  }

  if (stock <= LOW_STOCK_THRESHOLD) {
    return "low";
  }

  return "ok";
}

function getProductCardData(product: Product): ProductCardData {
  const displayStockCount = getDisplayStockCount(product);

  return {
    activePrice: getActivePrice(product),
    autoDeleteLabel: formatAutoDelete(product.autoDeleteAfterSale),
    displayStockCount,
    hasDiscount: hasDiscountPrice(product),
    isPointProduct: product.currency === "POINT",
    stockTone: getStockTone(displayStockCount, product.isSold),
  };
}

function getPriceText(activePrice: number, isPointProduct: boolean) {
  return isPointProduct
    ? Number(activePrice).toLocaleString()
    : `฿${Number(activePrice).toLocaleString()}`;
}

function getOriginalPriceText(
  product: Product,
  isPointProduct: boolean,
  currencySettings: ReturnType<typeof useCurrencySettings>,
) {
  return isPointProduct
    ? formatCurrencyAmount(Number(product.price), "POINT", currencySettings)
    : `฿${Number(product.price).toLocaleString()}`;
}

function getAvailabilityBadgeClass(isSold: boolean) {
  return isSold
    ? "bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/15"
    : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/15";
}

function getAvailabilityLabel(isSold: boolean) {
  return isSold ? "ขายแล้ว" : "พร้อมขาย";
}

function getStockBadgeClass(tone: StockTone) {
  if (tone === "out") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300";
  }

  if (tone === "low") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  }

  return "border-border bg-muted text-foreground";
}

function getStockToneLabel(tone: StockTone) {
  if (tone === "out") {
    return "หมดสต็อก";
  }

  if (tone === "low") {
    return "ใกล้หมด";
  }

  return null;
}

function getFeaturedButtonClass(isFeatured: boolean, isMobile: boolean) {
  const sizeClass = isMobile ? "h-9 w-9" : "mx-auto";

  return cn(
    `${sizeClass} rounded-full border transition`,
    isFeatured
      ? "border-amber-200 bg-amber-50 text-amber-500 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:hover:bg-amber-500/20"
      : "border-transparent text-muted-foreground/60 hover:border-border hover:bg-muted hover:text-foreground",
  );
}

function getFeaturedIconClass(isFeatured: boolean, isDesktop: boolean) {
  return cn(
    isDesktop ? "mx-auto h-4 w-4" : "h-4 w-4",
    isFeatured ? "fill-current text-amber-500" : "text-muted-foreground/40",
  );
}

function EmptyProductState() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
      <div className="rounded-full bg-muted p-3 text-muted-foreground">
        <Package className="h-6 w-6" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">ไม่พบสินค้าที่ตรงเงื่อนไข</p>
        <p className="mt-1 text-sm text-muted-foreground">ลองค้นหาด้วยชื่ออื่นหรือเปลี่ยนหมวดหมู่ที่เลือก</p>
      </div>
    </div>
  );
}

interface ProductActionsMenuProps {
  canCreate: boolean;
  canDelete: boolean;
  canEdit: boolean;
  loadingId: Product["id"] | null;
  onDelete: (productId: Product["id"], productName: string) => void;
  onDuplicate: (productId: Product["id"]) => void;
  product: Product;
}

function ProductActionsMenu({
  canCreate,
  canDelete,
  canEdit,
  loadingId,
  onDelete,
  onDuplicate,
  product,
}: Readonly<ProductActionsMenuProps>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`เมนูจัดการสินค้า ${product.name}`}
          className="rounded-full border border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/product/${product.id}`} className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            ดูสินค้า
          </Link>
        </DropdownMenuItem>
        {canEdit ? (
          <DropdownMenuItem asChild>
            <Link href={`/admin/products/${product.id}/edit`} className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              แก้ไขสินค้า
            </Link>
          </DropdownMenuItem>
        ) : null}
        {canCreate ? (
          <DropdownMenuItem
            onClick={() => onDuplicate(product.id)}
            disabled={loadingId === product.id}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            คัดลอกสินค้า
          </DropdownMenuItem>
        ) : null}
        {canDelete ? <DropdownMenuSeparator /> : null}
        {canDelete ? (
          <DropdownMenuItem
            onClick={() => onDelete(product.id, product.name)}
            disabled={loadingId === product.id}
            className="flex items-center gap-2 text-rose-600 focus:text-rose-600 dark:text-rose-400 dark:focus:text-rose-400"
          >
            <Trash2 className="h-4 w-4" />
            ลบสินค้า
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface FeaturedToggleProps {
  canEdit: boolean;
  isLoading: boolean;
  isMobile?: boolean;
  isFeatured: boolean;
  onToggle: () => void;
}

function FeaturedToggle({
  canEdit,
  isLoading,
  isMobile = false,
  isFeatured,
  onToggle,
}: Readonly<FeaturedToggleProps>) {
  if (canEdit) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={isLoading}
        onClick={onToggle}
        aria-label={isFeatured ? "นำออกจากสินค้าแนะนำ" : "ตั้งเป็นสินค้าแนะนำ"}
        aria-pressed={isFeatured}
        className={getFeaturedButtonClass(isFeatured, isMobile)}
      >
        <Star className={cn("h-4 w-4", isFeatured ? "fill-current" : "")} />
      </Button>
    );
  }

  return <Star className={getFeaturedIconClass(isFeatured, !isMobile)} />;
}

interface MobileProductCardProps extends ProductActionsMenuProps {
  currencySettings: ReturnType<typeof useCurrencySettings>;
  onToggleFeatured: (productId: Product["id"], currentFeatured: boolean) => void;
}

function MobileProductCard({
  canCreate,
  canDelete,
  canEdit,
  currencySettings,
  loadingId,
  onDelete,
  onDuplicate,
  onToggleFeatured,
  product,
}: Readonly<MobileProductCardProps>) {
  const { activePrice, autoDeleteLabel, displayStockCount, hasDiscount, isPointProduct, stockTone } =
    getProductCardData(product);
  const stockToneLabel = getStockToneLabel(stockTone);

  return (
    <div key={product.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar className="h-14 w-14 rounded-2xl border border-border shadow-sm">
          <AvatarImage src={product.imageUrl || undefined} alt={product.name} className="object-cover" />
          <AvatarFallback className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 text-xs font-semibold text-blue-700 dark:from-blue-500/20 dark:to-indigo-500/20 dark:text-blue-300">
            {product.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{product.name}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {product.description || "ไม่มีรายละเอียดเพิ่มเติม"}
              </p>
            </div>

            <ProductActionsMenu
              canCreate={canCreate}
              canDelete={canDelete}
              canEdit={canEdit}
              loadingId={loadingId}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              product={product}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full bg-muted px-2.5 py-1 text-foreground">
              {product.category || "ทั่วไป"}
            </Badge>
            <Badge
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                getAvailabilityBadgeClass(product.isSold),
              )}
            >
              {getAvailabilityLabel(product.isSold)}
            </Badge>
            {autoDeleteLabel ? (
              <Badge
                variant="outline"
                className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
              >
                <Timer className="mr-1 h-3 w-3" />
                {autoDeleteLabel}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/60 p-3">
          <p className="text-xs text-muted-foreground">ราคา</p>
          <div className="mt-1 flex items-center gap-1.5 text-base font-semibold text-foreground">
            {isPointProduct ? <Gem className="h-4 w-4 text-violet-500" /> : null}
            <span>{getPriceText(activePrice, isPointProduct)}</span>
          </div>
          {hasDiscount ? (
            <p className="mt-1 text-xs text-muted-foreground/70 line-through">
              {getOriginalPriceText(product, isPointProduct, currencySettings)}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl bg-muted/60 p-3">
          <p className="text-xs text-muted-foreground">สต็อก</p>
          <div
            className={cn(
              "mt-1 flex items-center gap-1 text-base font-semibold",
              stockTone === "out" && "text-rose-600 dark:text-rose-400",
              stockTone === "low" && "text-amber-600 dark:text-amber-400",
              stockTone === "ok" && "text-foreground",
            )}
          >
            <Package className="h-4 w-4 opacity-60" />
            {displayStockCount}
          </div>
          {stockToneLabel ? (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                stockTone === "out"
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-amber-600 dark:text-amber-400",
              )}
            >
              {stockToneLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/60 px-3 py-2.5">
        <div className="text-sm font-medium text-muted-foreground">แนะนำ</div>
        <FeaturedToggle
          canEdit={canEdit}
          isLoading={loadingId === product.id}
          isMobile
          isFeatured={product.isFeatured}
          onToggle={() => onToggleFeatured(product.id, product.isFeatured)}
        />
      </div>
    </div>
  );
}

interface DesktopProductRowProps extends MobileProductCardProps {
  index: number;
}

function DesktopProductRow({
  canCreate,
  canDelete,
  canEdit,
  currencySettings,
  index,
  loadingId,
  onDelete,
  onDuplicate,
  onToggleFeatured,
  product,
}: Readonly<DesktopProductRowProps>) {
  const { activePrice, autoDeleteLabel, displayStockCount, hasDiscount, isPointProduct, stockTone } =
    getProductCardData(product);
  const stockToneLabel = getStockToneLabel(stockTone);

  return (
    <TableRow
      key={product.id}
      className={cn(
        "border-border transition hover:bg-blue-50/40 dark:hover:bg-blue-500/10",
        index % 2 === 0 ? "bg-card" : "bg-muted/40",
      )}
    >
      <TableCell>
        <Avatar className="h-11 w-11 rounded-xl border border-border shadow-sm">
          <AvatarImage src={product.imageUrl || undefined} alt={product.name} className="object-cover" />
          <AvatarFallback className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 text-xs font-semibold text-blue-700 dark:from-blue-500/20 dark:to-indigo-500/20 dark:text-blue-300">
            {product.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </TableCell>

      <TableCell>
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{product.name}</p>
          <p className="line-clamp-1 max-w-[280px] text-sm text-muted-foreground">
            {product.description || "ไม่มีรายละเอียดเพิ่มเติม"}
          </p>
        </div>
      </TableCell>

      <TableCell>
        <Badge variant="secondary" className="rounded-full bg-muted px-2.5 py-1 text-foreground">
          {product.category || "ทั่วไป"}
        </Badge>
      </TableCell>

      <TableCell className="text-center">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 text-base font-semibold text-foreground">
            {isPointProduct ? <Gem className="h-4 w-4 text-violet-500" /> : null}
            <span>{getPriceText(activePrice, isPointProduct)}</span>
          </div>
          {hasDiscount ? (
            <>
              <p className="text-xs text-muted-foreground/70 line-through">
                {getOriginalPriceText(product, isPointProduct, currencySettings)}
              </p>
              <Badge className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/10">
                ลดราคา
              </Badge>
            </>
          ) : null}
        </div>
      </TableCell>

      <TableCell className="text-center">
        <div className="flex flex-col items-center gap-1">
          <Badge
            variant="outline"
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
              getStockBadgeClass(stockTone),
            )}
          >
            <Package className="h-3.5 w-3.5 opacity-60" />
            {displayStockCount}
          </Badge>
          {stockToneLabel ? (
            <span
              className={cn(
                "text-xs font-medium",
                stockTone === "out"
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-amber-600 dark:text-amber-400",
              )}
            >
              {stockToneLabel}
            </span>
          ) : null}
        </div>
      </TableCell>

      <TableCell className="text-center">
        <div className="flex flex-col items-center gap-2">
          <Badge
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              getAvailabilityBadgeClass(product.isSold),
            )}
          >
            {getAvailabilityLabel(product.isSold)}
          </Badge>
          {autoDeleteLabel ? (
            <Badge
              variant="outline"
              className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
            >
              <Timer className="mr-1 h-3 w-3" />
              {autoDeleteLabel}
            </Badge>
          ) : null}
        </div>
      </TableCell>

      <TableCell className="text-center">
        <FeaturedToggle
          canEdit={canEdit}
          isLoading={loadingId === product.id}
          isFeatured={product.isFeatured}
          onToggle={() => onToggleFeatured(product.id, product.isFeatured)}
        />
      </TableCell>

      <TableCell className="text-right">
        <ProductActionsMenu
          canCreate={canCreate}
          canDelete={canDelete}
          canEdit={canEdit}
          loadingId={loadingId}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          product={product}
        />
      </TableCell>
    </TableRow>
  );
}

interface SortableHeadButtonProps {
  activeKey: SortKey;
  dir: SortDir;
  label: string;
  sortKey: Exclude<SortKey, "default">;
  onSort: (key: Exclude<SortKey, "default">) => void;
}

function SortableHeadButton({
  activeKey,
  dir,
  label,
  sortKey,
  onSort,
}: Readonly<SortableHeadButtonProps>) {
  const isActive = activeKey === sortKey;

  let icon = <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  if (isActive) {
    icon = dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  }

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      aria-label={`เรียงตาม${label}`}
      className={cn(
        "inline-flex items-center gap-1 uppercase tracking-[0.12em] transition hover:text-foreground",
        isActive ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
      {icon}
    </button>
  );
}

export default function ProductTable({
  products,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: Readonly<ProductTableProps>) {
  const currencySettings = useCurrencySettings();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [loadingId, setLoadingId] = useState<string | number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [featuredOverrides, setFeaturedOverrides] = useState<Record<string, boolean>>({});

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(products.map((product) => product.category).filter(Boolean) as string[])
    );

    return ["ทั้งหมด", ...uniqueCategories];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        (product.category ?? "").toLowerCase().includes(query) ||
        (product.description ?? "").toLowerCase().includes(query);
      const matchesCategory =
        selectedCategory === "ทั้งหมด" || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const sortedProducts = useMemo(() => {
    if (sortKey === "default") {
      return filteredProducts;
    }

    const items = [...filteredProducts];

    items.sort((a, b) => {
      let comparison = 0;

      if (sortKey === "name") {
        comparison = a.name.localeCompare(b.name, "th");
      } else if (sortKey === "price") {
        comparison = getActivePrice(a) - getActivePrice(b);
      } else {
        comparison = getDisplayStockCount(a) - getDisplayStockCount(b);
      }

      return sortDir === "asc" ? comparison : -comparison;
    });

    return items;
  }, [filteredProducts, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedProducts = sortedProducts
    .slice(startIndex, startIndex + itemsPerPage)
    .map((product) => ({
      ...product,
      isFeatured: featuredOverrides[String(product.id)] ?? product.isFeatured,
    }));

  const handleSort = (key: Exclude<SortKey, "default">) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const handleMobileSortChange = (value: string) => {
    if (value === "default") {
      setSortKey("default");
      setSortDir("asc");
    } else {
      const [key, dir] = value.split("-") as [Exclude<SortKey, "default">, SortDir];
      setSortKey(key);
      setSortDir(dir);
    }
    setCurrentPage(1);
  };

  const mobileSortValue = sortKey === "default" ? "default" : `${sortKey}-${sortDir}`;

  const handleToggleFeatured = async (productId: string | number, currentFeatured: boolean) => {
    const nextFeatured = !currentFeatured;

    setFeaturedOverrides((prev) => ({ ...prev, [String(productId)]: nextFeatured }));
    setLoadingId(productId);

    try {
      const response = await fetchWithCsrf(`/api/admin/products/${productId}/featured`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isFeatured: nextFeatured }),
      });

      if (!response.ok) {
        throw new Error("ไม่สามารถอัปเดตสินค้าแนะนำได้");
      }

      showSuccess(
        currentFeatured ? "นำสินค้าออกจากสินค้าแนะนำแล้ว" : "เพิ่มสินค้าไปยังสินค้าแนะนำแล้ว"
      );
      router.refresh();
    } catch (error) {
      console.error(error);
      setFeaturedOverrides((prev) => ({ ...prev, [String(productId)]: currentFeatured }));
      showError("ไม่สามารถอัปเดตสินค้าแนะนำได้");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDuplicate = async (productId: string | number) => {
    setLoadingId(productId);

    try {
      const response = await fetchWithCsrf(`/api/admin/products/${productId}/duplicate`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("ไม่สามารถคัดลอกสินค้าได้");
      }

      showSuccess("คัดลอกสินค้าเรียบร้อยแล้ว");
      router.refresh();
    } catch (error) {
      console.error(error);
      showError("ไม่สามารถคัดลอกสินค้าได้");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (productId: string | number, productName: string) => {
    const confirmed = await showConfirm(
      "ลบสินค้า",
      `คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า "${productName}"? การดำเนินการนี้ไม่สามารถย้อนกลับได้`
    );

    if (!confirmed) {
      return;
    }

    setLoadingId(productId);

    try {
      const response = await fetchWithCsrf(`/api/products/${productId}`, {
        method: "DELETE",
      });

      const payload = await response.json().catch(() => null) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message || "ไม่สามารถลบสินค้าได้");
      }

      showSuccess("ลบสินค้าเรียบร้อยแล้ว");
      router.refresh();
    } catch (error) {
      console.error(error);
      showError("ไม่สามารถลบสินค้าได้");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/90 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <LayoutGrid className="h-4 w-4 opacity-70" />
            <span>หมวดหมู่</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const isActive = selectedCategory === category;
              const count =
                category === "ทั้งหมด"
                  ? products.length
                  : products.filter((product) => product.category === category).length;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(category);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                    isActive
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                      : "border-border bg-muted text-muted-foreground hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                  )}
                >
                  <span>{category}</span>
                  <span className={cn("text-xs", isActive ? "text-blue-100" : "text-muted-foreground/70")}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full flex-1 sm:min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ หมวดหมู่ หรือรายละเอียด..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full rounded-2xl border border-border bg-muted pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-blue-500 focus:bg-card focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground md:hidden">
            <span>เรียงตาม</span>
            <select
              value={mobileSortValue}
              onChange={(event) => handleMobileSortChange(event.target.value)}
              aria-label="เรียงลำดับสินค้า"
              className="h-10 flex-1 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-500/20"
            >
              {MOBILE_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
            <span>แสดง</span>
            <select
              value={itemsPerPage}
              onChange={(event) => {
                setItemsPerPage(Number(event.target.value));
                setCurrentPage(1);
              }}
              aria-label="จำนวนรายการต่อหน้า"
              className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-500/20"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span>รายการ</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {paginatedProducts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-4 py-16 text-center text-muted-foreground shadow-sm">
            <EmptyProductState />
          </div>
        ) : (
          paginatedProducts.map((product) => {
            return (
              <MobileProductCard
                key={product.id}
                canCreate={canCreate}
                canDelete={canDelete}
                canEdit={canEdit}
                currencySettings={currencySettings}
                loadingId={loadingId}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onToggleFeatured={handleToggleFeatured}
                product={product}
              />
            );
          })
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-20 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                รูป
              </TableHead>
              <TableHead className="text-xs font-semibold">
                <SortableHeadButton
                  activeKey={sortKey}
                  dir={sortDir}
                  label="ชื่อสินค้า"
                  sortKey="name"
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                หมวดหมู่
              </TableHead>
              <TableHead className="text-center text-xs font-semibold">
                <SortableHeadButton
                  activeKey={sortKey}
                  dir={sortDir}
                  label="ราคา"
                  sortKey="price"
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="text-center text-xs font-semibold">
                <SortableHeadButton
                  activeKey={sortKey}
                  dir={sortDir}
                  label="สต็อก"
                  sortKey="stock"
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                สถานะ
              </TableHead>
              <TableHead className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                แนะนำ
              </TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                จัดการ
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
                  <EmptyProductState />
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.map((product, index) => {
                return (
                  <DesktopProductRow
                    key={product.id}
                    canCreate={canCreate}
                    canDelete={canDelete}
                    canEdit={canEdit}
                    currencySettings={currencySettings}
                    index={index}
                    loadingId={loadingId}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onToggleFeatured={handleToggleFeatured}
                    product={product}
                  />
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          แสดง {sortedProducts.length === 0 ? 0 : startIndex + 1} ถึง {Math.min(startIndex + itemsPerPage, sortedProducts.length)} จาก {sortedProducts.length} รายการ
        </p>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={safeCurrentPage === 1}
            aria-label="หน้าก่อนหน้า"
            className="h-9 w-9 rounded-xl border-border bg-card disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .slice(Math.max(0, safeCurrentPage - 2), Math.max(3, safeCurrentPage + 1))
              .map((pageNumber) => (
                <Button
                  key={pageNumber}
                  type="button"
                  variant={pageNumber === safeCurrentPage ? "default" : "outline"}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={cn(
                    "h-9 min-w-9 rounded-xl px-3",
                    pageNumber === safeCurrentPage
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  {pageNumber}
                </Button>
              ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={safeCurrentPage === totalPages}
            aria-label="หน้าถัดไป"
            className="h-9 w-9 rounded-xl border-border bg-card disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
