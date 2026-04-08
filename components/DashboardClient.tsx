"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PurchasedItem } from "@/components/PurchasedItem";
import { DailyTopupSummary } from "@/components/DailyTopupSummary";
import { DatePicker } from "@/components/DatePicker";
import { DateRangePicker } from "@/components/DateRangePicker";
import type { DateRange } from "react-day-picker";
import { subDays, format } from "date-fns";
import { th } from "date-fns/locale";
import {
    Wallet,
    Package,
    ShoppingBag,
    Loader2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────
interface PurchaseItem {
    id: string;
    orderId?: string;
    title: string;
    image: string;
    date: string;
    price: number;
    secretData: string;
}

interface DashboardClientProps {
    username: string;
    initialCreditBalance?: number;
}

// ─── Helper ─────────────────────────────────────────────
function toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// ─── Component ──────────────────────────────────────────
export function DashboardClient({ }: Readonly<DashboardClientProps>) {
    const [topupRange, setTopupRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 6),
        to: new Date(),
    });
    const [purchasesDate, setPurchasesDate] = useState<Date>(new Date());

    // Purchases data
    const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
    const [purchasesLoading, setPurchasesLoading] = useState(true);

    // ── Fetch Purchases ─────────────────────────────────
    const fetchPurchases = useCallback(async () => {
        setPurchasesLoading(true);
        try {
            const res = await fetch(`/api/dashboard/purchases?date=${toDateString(purchasesDate)}`);
            const json = await res.json();
            if (json.success) setPurchases(json.data);
        } catch (err) {
            console.error("Failed to fetch purchases:", err);
        } finally {
            setPurchasesLoading(false);
        }
    }, [purchasesDate]);

    useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

    // ── Format selected date in Thai ────────────────────
    const formatThaiDate = (date: Date) =>
        date.toLocaleDateString("th-TH", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

    let topupRangeLabel = "เลือกช่วงวันที่";
    if (topupRange?.from) {
        if (topupRange.to && topupRange.from.toDateString() !== topupRange.to.toDateString()) {
            topupRangeLabel = `${format(topupRange.from, "d MMM yyyy", { locale: th })} – ${format(topupRange.to, "d MMM yyyy", { locale: th })}`;
        } else {
            topupRangeLabel = format(topupRange.from, "d MMM yyyy", { locale: th });
        }
    }

    return (
        <Tabs defaultValue="topup" className="w-full">
            <div className="mb-6">
                <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-muted/80 p-1 backdrop-blur-sm">
                <TabsTrigger
                    value="topup"
                    className="min-h-10 gap-1.5 rounded-lg px-2 py-2 text-xs whitespace-normal sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-200"
                >
                    <Wallet className="h-4 w-4" />
                    <span className="hidden sm:inline">สรุปเติมเงิน</span>
                    <span className="sm:hidden">เติมเงิน</span>
                </TabsTrigger>
                <TabsTrigger
                    value="purchases"
                    className="min-h-10 gap-1.5 rounded-lg px-2 py-2 text-xs whitespace-normal sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-200"
                >
                    <Package className="h-4 w-4" />
                    <span className="hidden sm:inline">สินค้าล่าสุด</span>
                    <span className="sm:hidden">สินค้า</span>
                </TabsTrigger>
                </TabsList>
            </div>

            {/* ════════════════════════════════════════════
                Tab 1: สรุปเติมเงิน (Topup Summary)
               ════════════════════════════════════════════ */}
            <TabsContent value="topup" className="animate-page-enter space-y-4">
                {/* Date Range Picker */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">💰 สรุปเติมเงิน</h2>
                        <p className="text-sm text-muted-foreground">
                            {topupRangeLabel}
                        </p>
                    </div>
                    <DateRangePicker
                        value={topupRange}
                        onChange={(r) => r && setTopupRange(r)}
                        placeholder="เลือกช่วงวันที่"
                    />
                </div>

                <DailyTopupSummary
                    startDate={topupRange?.from ? format(topupRange.from, "yyyy-MM-dd") : undefined}
                    endDate={topupRange?.to ? format(topupRange.to, "yyyy-MM-dd") : undefined}
                />
            </TabsContent>

            {/* ════════════════════════════════════════════
                Tab 3: สินค้าล่าสุด (Recent Purchases)
               ════════════════════════════════════════════ */}
            <TabsContent value="purchases" className="animate-page-enter space-y-4">
                {/* Date Picker */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">📦 สินค้าที่ซื้อ</h2>
                        <p className="text-sm text-muted-foreground">{formatThaiDate(purchasesDate)}</p>
                    </div>
                    <DatePicker
                        value={purchasesDate}
                        onChange={(d) => d && setPurchasesDate(d)}
                        placeholder="เลือกวันที่"
                    />
                </div>

                {purchasesLoading && (
                    <Card className="bg-card">
                        <CardContent className="py-12 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-muted-foreground">กำลังโหลด...</span>
                        </CardContent>
                    </Card>
                )}
                {!purchasesLoading && purchases.length === 0 && (
                    <Card className="py-12 bg-card">
                        <CardContent className="text-center">
                            <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-2">
                                ไม่พบสินค้า
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                ไม่มีรายการซื้อสินค้าในวันที่เลือก
                            </p>
                            <Link href="/shop">
                                <Button>
                                    <ShoppingBag className="h-4 w-4 mr-2" />
                                    เริ่มช้อปปิ้ง
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
                {!purchasesLoading && purchases.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {purchases.map((item) => (
                            <PurchasedItem
                                key={item.id}
                                orderId={item.orderId ?? item.id}
                                title={item.title}
                                image={item.image}
                                date={item.date}
                                secretData={item.secretData}
                            />
                        ))}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    );
}
