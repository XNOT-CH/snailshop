import { db, products } from "@/lib/db";
import { and, eq, isNotNull, lte, sql, gt } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, ArrowLeft, Timer, Package } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TrashRunButton } from "@/components/admin/TrashRunButton";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function ProductTrashPage() {
    const nowStr = new Date().toISOString().slice(0, 19).replace("T", " ");

    // Products that have PASSED their scheduled delete time (overdue)
    const overdueProducts = await db.query.products.findMany({
        where: and(
            eq(products.isSold, true),
            isNotNull(products.scheduledDeleteAt),
            lte(products.scheduledDeleteAt, sql`${nowStr}`)
        ),
        orderBy: (t, { asc }) => asc(t.scheduledDeleteAt),
    });

    // Products that are sold and SCHEDULED for future deletion
    const pendingProducts = await db.query.products.findMany({
        where: and(
            eq(products.isSold, true),
            isNotNull(products.scheduledDeleteAt),
            gt(products.scheduledDeleteAt, sql`${nowStr}`)
        ),
        orderBy: (t, { asc }) => asc(t.scheduledDeleteAt),
    });

    function formatDate(dateStr: string | null) {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleString("th-TH", {
            year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/admin/products">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                            <Trash2 className="h-7 w-7 text-orange-500" />
                            ถังขยะสินค้า
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            สินค้าที่ถูกซื้อแล้วและตั้งเวลาลบอัตโนมัติ
                        </p>
                    </div>
                </div>
                {overdueProducts.length > 0 && (
                    <TrashRunButton count={overdueProducts.length} />
                )}
            </div>

            {/* Overdue - past scheduledDeleteAt */}
            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                        <Trash2 className="h-5 w-5" />
                        รอลบ – ครบกำหนดแล้ว ({overdueProducts.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {overdueProducts.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <Package className="mx-auto h-10 w-10 opacity-30 mb-3" />
                            <p>ไม่มีสินค้าที่ครบกำหนดลบ</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {overdueProducts.map((p) => (
                                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                                    <div className="relative h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                                        {p.imageUrl ? (
                                            <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                                        ) : (
                                            <Package className="h-6 w-6 m-2 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{p.name}</p>
                                        <p className="text-xs text-muted-foreground">{p.category}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <Badge variant="destructive" className="text-xs gap-1">
                                            <Timer className="h-3 w-3" />
                                            ครบกำหนดแล้ว
                                        </Badge>
                                        <p className="text-xs text-muted-foreground mt-1">{formatDate(p.scheduledDeleteAt)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pending - not yet due */}
            <Card className="border-orange-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                        <Timer className="h-5 w-5" />
                        รอลบ – ยังไม่ถึงกำหนด ({pendingProducts.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {pendingProducts.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <Timer className="mx-auto h-10 w-10 opacity-30 mb-3" />
                            <p>ไม่มีสินค้าที่รอลบ</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {pendingProducts.map((p) => (
                                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100">
                                    <div className="relative h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                                        {p.imageUrl ? (
                                            <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                                        ) : (
                                            <Package className="h-6 w-6 m-2 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{p.name}</p>
                                        <p className="text-xs text-muted-foreground">{p.category}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <Badge variant="outline" className="text-xs gap-1 text-orange-600 border-orange-300">
                                            <Timer className="h-3 w-3" />
                                            {formatDate(p.scheduledDeleteAt)}
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
