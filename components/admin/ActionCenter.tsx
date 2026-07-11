import Link from "next/link";
import { and, count, eq, isNotNull, lte, sql } from "drizzle-orm";
import { AlertTriangle, ArrowRight, MessagesSquare, PackageX, ReceiptText } from "lucide-react";
import { db, products, topups } from "@/lib/db";
import { countAdminUnread } from "@/lib/chat";
import { PERMISSIONS } from "@/lib/permissions";
import { mysqlDateTimeToIso } from "@/lib/utils/date";

const LOW_STOCK_THRESHOLD = 3;

/** "ค้างนานสุด 3 ชม."-style label from a UTC datetime string. */
function formatAge(oldestIso: string): string {
    const ageMs = Date.now() - new Date(oldestIso).getTime();
    const hours = Math.floor(ageMs / (60 * 60 * 1000));
    if (hours < 1) return "ไม่ถึง 1 ชม.";
    if (hours < 24) return `${hours} ชม.`;
    return `${Math.floor(hours / 24)} วัน`;
}

interface ActionItem {
    key: string;
    label: string;
    detail: string | null;
    count: number;
    href: string;
    icon: typeof ReceiptText;
}

export async function ActionCenter({ permissions }: Readonly<{ permissions: string[] }>) {
    const permissionSet = new Set(permissions);
    const items: ActionItem[] = [];

    const [pendingSlips, unread, lowStock] = await Promise.all([
        permissionSet.has(PERMISSIONS.SLIP_VIEW)
            ? db
                  .select({ pending: count(), oldest: sql<string | null>`MIN(${topups.createdAt})` })
                  .from(topups)
                  .where(eq(topups.status, "PENDING"))
            : null,
        permissionSet.has(PERMISSIONS.CHAT_VIEW) ? countAdminUnread() : null,
        permissionSet.has(PERMISSIONS.PRODUCT_VIEW)
            ? db
                  .select({ lowStock: count() })
                  .from(products)
                  .where(and(eq(products.isSold, false), isNotNull(products.stockCount), lte(products.stockCount, LOW_STOCK_THRESHOLD)))
            : null,
    ]);

    if (pendingSlips) {
        const [{ pending, oldest }] = pendingSlips;
        const oldestIso = mysqlDateTimeToIso(oldest);
        items.push({
            key: "slips",
            label: "สลิปรอตรวจ",
            detail: pending > 0 && oldestIso ? `ค้างนานสุด ${formatAge(oldestIso)}` : null,
            count: Number(pending),
            href: "/admin/slips",
            icon: ReceiptText,
        });
    }

    if (unread) {
        items.push({
            key: "chat",
            label: "แชทยังไม่ได้อ่าน",
            detail: unread.totalUnread > 0 ? `${unread.totalUnread.toLocaleString()} ข้อความ` : null,
            count: unread.unreadConversations,
            href: "/admin/chat",
            icon: MessagesSquare,
        });
    }

    if (lowStock) {
        items.push({
            key: "stock",
            label: `สต็อกเหลือ ≤ ${LOW_STOCK_THRESHOLD} ชิ้น`,
            detail: null,
            count: Number(lowStock[0].lowStock),
            href: "/admin/products",
            icon: PackageX,
        });
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            {items.map((item) => {
                const Icon = item.icon;
                const hasWork = item.count > 0;
                return (
                    <Link
                        key={item.key}
                        href={item.href}
                        className={`group flex items-center gap-3 rounded-2xl border p-4 transition-colors ${
                            hasWork
                                ? "border-amber-300/70 bg-amber-50/70 hover:bg-amber-100/70 dark:border-amber-700/50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
                                : "border-border/80 bg-card/95 hover:bg-muted/50"
                        }`}
                    >
                        <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                hasWork ? "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300" : "bg-muted text-muted-foreground"
                            }`}
                        >
                            {hasWork ? <AlertTriangle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground">
                                {hasWork ? `${item.count.toLocaleString()} รายการ${item.detail ? ` · ${item.detail}` : ""}` : "ไม่มีงานค้าง"}
                            </p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                );
            })}
        </div>
    );
}
