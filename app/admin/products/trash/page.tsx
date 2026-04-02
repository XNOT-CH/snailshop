import Image from "next/image";
import Link from "next/link";
import { History, Package, Timer, Trash2, ArrowLeft } from "lucide-react";
import { and, eq, gt, isNotNull, lte, sql } from "drizzle-orm";
import { AUDIT_ACTIONS } from "@/lib/auditLog";
import { runAutoDelete } from "@/lib/autoDelete";
import { db, products } from "@/lib/db";
import { TrashRunButton } from "@/components/admin/TrashRunButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

interface DeletedProductHistoryItem {
    id: string;
    name: string;
    category: string;
    imageUrl: string | null;
    scheduledDeleteAt: string | null;
    deletedAt: string;
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return "-";

    return new Date(dateStr).toLocaleString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default async function ProductTrashPage() {
    await runAutoDelete();

    const nowStr = new Date().toISOString().slice(0, 19).replace("T", " ");

    const overdueProducts = await db.query.products.findMany({
        where: and(
            eq(products.isSold, true),
            isNotNull(products.scheduledDeleteAt),
            lte(products.scheduledDeleteAt, sql`${nowStr}`)
        ),
        orderBy: (t, { asc }) => asc(t.scheduledDeleteAt),
    });

    const pendingProducts = await db.query.products.findMany({
        where: and(
            eq(products.isSold, true),
            isNotNull(products.scheduledDeleteAt),
            gt(products.scheduledDeleteAt, sql`${nowStr}`)
        ),
        orderBy: (t, { asc }) => asc(t.scheduledDeleteAt),
    });

    const deleteAuditLogs = await db.query.auditLogs.findMany({
        where: (table, { and: combine, eq: equals }) =>
            combine(
                equals(table.action, AUDIT_ACTIONS.PRODUCT_DELETE),
                equals(table.resourceId, "auto-delete")
            ),
        orderBy: (table, { desc }) => desc(table.createdAt),
        limit: 20,
        columns: {
            id: true,
            details: true,
            createdAt: true,
        },
    });

    const deletedHistory = deleteAuditLogs.flatMap((log) => {
        if (!log.details) {
            return [] as DeletedProductHistoryItem[];
        }

        try {
            const parsed = JSON.parse(log.details) as {
                deletedProducts?: Array<{
                    id?: string;
                    name?: string;
                    category?: string;
                    imageUrl?: string | null;
                    scheduledDeleteAt?: string | null;
                }>;
            };

            return (parsed.deletedProducts ?? [])
                .filter((item) => typeof item?.name === "string")
                .map((item, index) => ({
                    id: item.id ?? `${log.id}-${index}`,
                    name: item.name ?? "ไม่ทราบชื่อสินค้า",
                    category: item.category ?? "-",
                    imageUrl: item.imageUrl ?? null,
                    scheduledDeleteAt: item.scheduledDeleteAt ?? null,
                    deletedAt: log.createdAt,
                }));
        } catch {
            return [] as DeletedProductHistoryItem[];
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
                            สินค้าที่ถูกซื้อแล้วและตั้งเวลาลบอัตโนมัติ
                        </p>
                    </div>
                </div>

                {overdueProducts.length > 0 ? <TrashRunButton count={overdueProducts.length} /> : null}
            </div>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-700">
                        <History className="h-5 w-5 text-slate-500" />
                        ประวัติที่ลบแล้ว ({deletedHistory.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {deletedHistory.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <History className="mx-auto mb-3 h-10 w-10 opacity-30" />
                            <p>ยังไม่มีประวัติสินค้าที่ถูกลบอัตโนมัติ</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {deletedHistory.map((item) => (
                                <div
                                    key={`${item.id}-${item.deletedAt}`}
                                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
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
                                            ลบแล้ว
                                        </Badge>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            ลบเมื่อ {formatDate(item.deletedAt)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            ครบกำหนด {formatDate(item.scheduledDeleteAt)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                        <Trash2 className="h-5 w-5" />
                        ถึงเวลาลบแล้ว ({overdueProducts.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {overdueProducts.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <Package className="mx-auto mb-3 h-10 w-10 opacity-30" />
                            <p>ไม่มีสินค้าที่ครบกำหนดลบ</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {overdueProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-3"
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
                                        <Badge variant="destructive" className="gap-1 text-xs">
                                            <Timer className="h-3 w-3" />
                                            ครบกำหนดแล้ว
                                        </Badge>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {formatDate(product.scheduledDeleteAt)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-orange-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                        <Timer className="h-5 w-5" />
                        ตั้งเวลารอลบ ({pendingProducts.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {pendingProducts.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <Timer className="mx-auto mb-3 h-10 w-10 opacity-30" />
                            <p>ไม่มีสินค้าที่รอลบ</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {pendingProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="flex items-center gap-3 rounded-lg border border-orange-100 bg-orange-50 p-3"
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
                                        <Badge
                                            variant="outline"
                                            className="gap-1 border-orange-300 text-xs text-orange-600"
                                        >
                                            <Timer className="h-3 w-3" />
                                            {formatDate(product.scheduledDeleteAt)}
                                        </Badge>
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
