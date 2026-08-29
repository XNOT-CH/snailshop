import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { History, Package, Timer, Trash2, ArrowLeft } from "lucide-react";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { AUDIT_ACTIONS } from "@/lib/auditLog";
import { runAutoDelete } from "@/lib/autoDelete";
import { db, products } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { mysqlDateTimeToIso, mysqlNow, TH_TIME_ZONE } from "@/lib/utils/date";
import { DeletedProductActions } from "@/components/admin/DeletedProductActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const PURGE_HISTORY_LIMIT = 20;

interface PurgedProductHistoryItem {
    id: string;
    name: string;
    category: string;
    imageUrl: string | null;
    purgedAt: string;
}

// Both deletedAt and scheduledDeleteAt are stored as UTC strings. Handing one
// straight to new Date() parses it as local time, which showed every timestamp
// on this page seven hours early.
function formatDate(dateStr: string | null) {
    const iso = mysqlDateTimeToIso(dateStr);
    if (!iso) return "-";

    return new Date(iso).toLocaleString("th-TH", {
        timeZone: TH_TIME_ZONE,
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default async function ProductTrashPage() {
    const access = await requirePermission(PERMISSIONS.PRODUCT_VIEW);
    if (!access.success) {
        redirect("/admin?error=คุณไม่มีสิทธิ์ดูสินค้า");
    }

    // Opening a page shouldn't write. The sweep only moves products into the
    // trash (recoverable), but it still runs solely for admins who could do it
    // by hand — a view-only account used to trigger it just by loading here.
    const canDeleteProducts = new Set(access.permissions ?? []).has(PERMISSIONS.PRODUCT_DELETE);
    if (canDeleteProducts) {
        await runAutoDelete();
    }

    // Same UTC string comparison the sweep itself uses, so "overdue" here means
    // exactly what it means in runAutoDelete().
    const nowUtc = mysqlNow();

    const trashedProducts = await db.query.products.findMany({
        where: isNotNull(products.deletedAt),
        orderBy: (t, { desc }) => desc(t.deletedAt),
    });

    // Still live, sold out, counting down. Once the timer passes, the sweep moves
    // them into the list above instead of dropping the row.
    const pendingProducts = await db.query.products.findMany({
        where: and(
            eq(products.isSold, true),
            isNull(products.deletedAt),
            isNotNull(products.scheduledDeleteAt)
        ),
        orderBy: (t, { asc }) => asc(t.scheduledDeleteAt),
    });

    const purgeAuditLogs = await db.query.auditLogs.findMany({
        where: (table, { eq: equals }) => equals(table.action, AUDIT_ACTIONS.PRODUCT_PERMANENT_DELETE),
        orderBy: (table, { desc }) => desc(table.createdAt),
        limit: PURGE_HISTORY_LIMIT,
        columns: {
            id: true,
            details: true,
            createdAt: true,
        },
    });

    // The permanent delete is the only irreversible step left, so it is the one
    // worth a history. Auto-trashing no longer destroys anything and shows up in
    // the trash list itself.
    const purgeHistory = purgeAuditLogs.flatMap<PurgedProductHistoryItem>((log) => {
        if (!log.details) return [];

        try {
            const parsed = JSON.parse(log.details) as {
                resourceName?: string;
                deletedData?: { category?: string; imageUrl?: string | null };
            };

            if (!parsed.resourceName) return [];

            return [{
                id: log.id,
                name: parsed.resourceName,
                category: parsed.deletedData?.category ?? "-",
                imageUrl: parsed.deletedData?.imageUrl ?? null,
                purgedAt: log.createdAt,
            }];
        } catch {
            return [];
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/admin/products">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
                            <Trash2 className="h-7 w-7 text-orange-500" />
                            ถังขยะสินค้า
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            สินค้าที่ลบเองและสินค้าที่ครบกำหนดลบอัตโนมัติ — กู้คืนได้ทั้งหมด จะหายถาวรก็ต่อเมื่อกดลบถาวรเท่านั้น
                        </p>
                    </div>
                </div>
            </div>

            <Card className="border-red-200 dark:border-red-500/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <Trash2 className="h-5 w-5" />
                        สินค้าในถังขยะ ({trashedProducts.length})
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        กู้คืนได้จนกว่าจะกดลบถาวร
                    </p>
                </CardHeader>
                <CardContent>
                    {trashedProducts.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <Trash2 className="mx-auto mb-3 h-10 w-10 opacity-30" />
                            <p>ไม่มีสินค้าในถังขยะ</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {trashedProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10"
                                >
                                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
                                        {product.imageUrl ? (
                                            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                                        ) : (
                                            <Package className="m-2 h-6 w-6 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {product.category} · ลบเมื่อ {formatDate(product.deletedAt)}
                                        </p>
                                    </div>
                                    <DeletedProductActions productId={product.id} productName={product.name} />
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-orange-200 dark:border-orange-500/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                        <Timer className="h-5 w-5" />
                        ตั้งเวลารอลบ ({pendingProducts.length})
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        สินค้าที่ขายหมดแล้วและตั้งเวลาลบอัตโนมัติ — ครบกำหนดแล้วจะย้ายเข้าถังขยะด้านบน
                    </p>
                </CardHeader>
                <CardContent>
                    {pendingProducts.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <Timer className="mx-auto mb-3 h-10 w-10 opacity-30" />
                            <p>ไม่มีสินค้าที่รอลบ</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {pendingProducts.map((product) => {
                                const isOverdue = product.scheduledDeleteAt
                                    ? product.scheduledDeleteAt <= nowUtc
                                    : false;

                                return (
                                    <div
                                        key={product.id}
                                        className="flex items-center gap-3 rounded-lg border border-orange-100 bg-orange-50 p-3 dark:border-orange-500/30 dark:bg-orange-500/12"
                                    >
                                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
                                            {product.imageUrl ? (
                                                <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                                            ) : (
                                                <Package className="m-2 h-6 w-6 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">{product.name}</p>
                                            <p className="text-xs text-muted-foreground">{product.category}</p>
                                        </div>
                                        <div className="flex-shrink-0 text-right">
                                            {isOverdue ? (
                                                <Badge variant="destructive" className="gap-1 text-xs">
                                                    <Timer className="h-3 w-3" />
                                                    รอรอบเก็บกวาด
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className="gap-1 border-orange-300 text-xs text-orange-600 dark:border-orange-500/40 dark:text-orange-300"
                                                >
                                                    <Timer className="h-3 w-3" />
                                                    {formatDate(product.scheduledDeleteAt)}
                                                </Badge>
                                            )}
                                            {isOverdue ? (
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    ครบกำหนด {formatDate(product.scheduledDeleteAt)}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <History className="h-5 w-5 text-muted-foreground" />
                        ประวัติการลบถาวร ({purgeHistory.length})
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        แสดง {PURGE_HISTORY_LIMIT} รายการล่าสุด — สินค้าเหล่านี้กู้คืนไม่ได้แล้ว
                    </p>
                </CardHeader>
                <CardContent>
                    {purgeHistory.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <History className="mx-auto mb-3 h-10 w-10 opacity-30" />
                            <p>ยังไม่มีสินค้าที่ถูกลบถาวร</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {purgeHistory.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3"
                                >
                                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
                                        {item.imageUrl ? (
                                            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                                        ) : (
                                            <Package className="m-2 h-6 w-6 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">{item.category}</p>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                        <Badge variant="secondary" className="text-xs">
                                            ลบถาวรแล้ว
                                        </Badge>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {formatDate(item.purgedAt)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
