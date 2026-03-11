"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    ArrowRight,
    Zap,
    BarChart3,
    Loader2,
    TrendingUp,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────
interface OverviewData {
    creditBalance: number;
    purchasesOnDate: number;
    totalSpending: number;
    totalTopup: number;
}

interface PurchaseItem {
    id: string;
    title: string;
    image: string;
    date: string;
    price: number;
    secretData: string;
}

interface DashboardClientProps {
    username: string;
    initialCreditBalance: number;
}

// ─── Helper ─────────────────────────────────────────────
function toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// ─── Component ──────────────────────────────────────────
export function DashboardClient({ username, initialCreditBalance }: DashboardClientProps) {
    const [overviewDate, setOverviewDate] = useState<Date>(new Date());
    const [topupRange, setTopupRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 6),
        to: new Date(),
    });
    const [purchasesDate, setPurchasesDate] = useState<Date>(new Date());

    // Overview data
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [overviewLoading, setOverviewLoading] = useState(true);

    // Purchases data
    const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
    const [purchasesLoading, setPurchasesLoading] = useState(true);

    // ── Fetch Overview ──────────────────────────────────
    const fetchOverview = useCallback(async () => {
        setOverviewLoading(true);
        try {
            const res = await fetch(`/api/dashboard/overview?date=${toDateString(overviewDate)}`);
            const json = await res.json();
            if (json.success) setOverview(json.data);
        } catch (err) {
            console.error("Failed to fetch overview:", err);
        } finally {
            setOverviewLoading(false);
        }
    }, [overviewDate]);

    useEffect(() => { fetchOverview(); }, [fetchOverview]);

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

    return (
        <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-11 mb-6 bg-muted/80 backdrop-blur-sm rounded-xl p-1">
                <TabsTrigger
                    value="overview"
                    className="gap-1.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-200"
                >
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">ภาพรวม</span>
                    <span className="sm:hidden">รวม</span>
                </TabsTrigger>
                <TabsTrigger
                    value="topup"
                    className="gap-1.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-200"
                >
                    <Wallet className="h-4 w-4" />
                    <span className="hidden sm:inline">สรุปเติมเงิน</span>
                    <span className="sm:hidden">เติมเงิน</span>
                </TabsTrigger>
                <TabsTrigger
                    value="purchases"
                    className="gap-1.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-200"
                >
                    <Package className="h-4 w-4" />
                    <span className="hidden sm:inline">สินค้าล่าสุด</span>
                    <span className="sm:hidden">สินค้า</span>
                </TabsTrigger>
            </TabsList>

            {/* ════════════════════════════════════════════
                Tab 1: ภาพรวม (Overview)
               ════════════════════════════════════════════ */}
            <TabsContent value="overview" className="animate-page-enter space-y-4">
                {/* Date Picker */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">📊 ภาพรวม</h2>
                        <p className="text-sm text-muted-foreground">{formatThaiDate(overviewDate)}</p>
                    </div>
                    <DatePicker
                        value={overviewDate}
                        onChange={(d) => d && setOverviewDate(d)}
                        placeholder="เลือกวันที่"
                    />
                </div>

                {overviewLoading ? (
                    <Card className="bg-card">
                        <CardContent className="py-12 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-muted-foreground">กำลังโหลด...</span>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {/* Credit Balance */}
                        <Card className="bg-primary text-primary-foreground overflow-hidden animate-card-up stagger-1 card-tilt">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium opacity-90">
                                    ยอดเครดิตปัจจุบัน
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline justify-between">
                                    <span className="text-4xl font-bold">
                                        ฿{(overview?.creditBalance ?? initialCreditBalance).toLocaleString()}
                                    </span>
                                    <Wallet className="h-8 w-8 opacity-50" />
                                </div>
                                <Link href="/dashboard/topup">
                                    <Button size="sm" variant="secondary" className="mt-4 gap-1 w-full">
                                        <Zap className="h-4 w-4" />
                                        เติมเงิน
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* Purchases on date */}
                        <Card className="bg-card animate-card-up stagger-2 card-tilt">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    สินค้าที่ซื้อ (วันนี้)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline justify-between">
                                    <span className="text-4xl font-bold text-foreground">
                                        {overview?.purchasesOnDate ?? 0}
                                    </span>
                                    <Package className="h-8 w-8 text-muted-foreground/50" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    ยอดใช้จ่าย ฿{(overview?.totalSpending ?? 0).toLocaleString()}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Topup on date */}
                        <Card className="bg-card animate-card-up stagger-3 card-tilt">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    ยอดเติมเงิน (วันนี้)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline justify-between">
                                    <span className="text-4xl font-bold text-foreground">
                                        ฿{(overview?.totalTopup ?? 0).toLocaleString()}
                                    </span>
                                    <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
                                </div>
                                <Link href="/shop">
                                    <Button variant="outline" className="mt-4 w-full gap-2">
                                        <ShoppingBag className="h-4 w-4" />
                                        ไปร้านค้า
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </TabsContent>

            {/* ════════════════════════════════════════════
                Tab 2: สรุปเติมเงิน (Topup Summary)
               ════════════════════════════════════════════ */}
            <TabsContent value="topup" className="animate-page-enter space-y-4">
                {/* Date Range Picker */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">💰 สรุปเติมเงิน</h2>
                        <p className="text-sm text-muted-foreground">
                            {topupRange?.from
                                ? topupRange.to && topupRange.from.toDateString() !== topupRange.to.toDateString()
                                    ? `${format(topupRange.from, "d MMM yyyy", { locale: th })} – ${format(topupRange.to, "d MMM yyyy", { locale: th })}`
                                    : format(topupRange.from, "d MMM yyyy", { locale: th })
                                : "เลือกช่วงวันที่"}
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

                {purchasesLoading ? (
                    <Card className="bg-card">
                        <CardContent className="py-12 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-muted-foreground">กำลังโหลด...</span>
                        </CardContent>
                    </Card>
                ) : purchases.length === 0 ? (
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
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {purchases.map((item) => (
                            <PurchasedItem
                                key={item.id}
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
