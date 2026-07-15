import Link from "next/link";
import { and, count, eq, isNotNull, lte, sql } from "drizzle-orm";
import { ChevronRight, ClipboardList, MessagesSquare, PackageX, ReceiptText } from "lucide-react";
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
    unit: string;
    href: string;
    icon: typeof ReceiptText;
    /** Icon tile colours used only while the item has outstanding work. */
    activeTile: string;
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
            unit: "รายการ",
            href: "/admin/slips",
            icon: ReceiptText,
            activeTile: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
        });
    }

    if (unread) {
        items.push({
            key: "chat",
            label: "แชทยังไม่ได้อ่าน",
            detail: unread.totalUnread > 0 ? `${unread.totalUnread.toLocaleString()} ข้อความ` : null,
            count: unread.unreadConversations,
            unit: "ห้องแชท",
            href: "/admin/chat",
            icon: MessagesSquare,
            activeTile: "bg-blue-100 text-[#145de7] dark:bg-blue-950/60 dark:text-blue-300",
        });
    }

    if (lowStock) {
        items.push({
            key: "stock",
            label: `สต็อกเหลือ ≤ ${LOW_STOCK_THRESHOLD} ชิ้น`,
            detail: null,
            count: Number(lowStock[0].lowStock),
            unit: "รายการ",
            href: "/admin/products",
            icon: PackageX,
            activeTile: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
        });
    }

    if (items.length === 0) {
        return null;
    }

    const openCount = items.filter((item) => item.count > 0).length;

    return (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)]">
            <div className="flex items-center gap-2 border-b border-border py-3 px-5">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-[#145de7]">
                    <ClipboardList className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-bold">งานที่ต้องทำ</span>
                <span className="ml-auto text-xs text-muted-foreground">
                    {openCount > 0 ? `${openCount} จาก ${items.length} อย่างรอจัดการ` : "เคลียร์หมดแล้ว"}
                </span>
            </div>

            <div className="divide-y divide-border/60">
                {items.map((item) => {
                    const Icon = item.icon;
                    const hasWork = item.count > 0;
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50"
                        >
                            <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                    hasWork ? item.activeTile : "bg-muted text-muted-foreground/70"
                                }`}
                            >
                                <Icon className="h-4.5 w-4.5" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className={`text-sm font-medium ${hasWork ? "" : "text-muted-foreground"}`}>{item.label}</p>
                                {hasWork ? (
                                    item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>
                                ) : (
                                    <p className="text-xs text-muted-foreground/70">ไม่มีงานค้าง</p>
                                )}
                            </div>

                            <div className="flex shrink-0 items-baseline gap-1.5">
                                <span className={`text-xl font-bold tabular-nums ${hasWork ? "" : "text-muted-foreground/50"}`}>
                                    {item.count.toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground/70">{item.unit}</span>
                            </div>

                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
