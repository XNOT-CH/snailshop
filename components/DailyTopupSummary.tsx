"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LabelList,
} from "recharts";
import {
    Wallet,
    Users,
    TrendingUp,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    Banknote,
    AlertTriangle,
    Eye,
    X,
    ArrowRightLeft,
    Calculator,
    Search,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Filter,
    Check,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────
interface TopupRecord {
    id: string;
    username: string;
    amount: number;
    time: string;
    status: string;
    senderBank: string | null;
    proofImage: string | null;
    transactionRef: string | null;
    rejectReason: string | null;
}

interface StatusSummary {
    approved: { count: number; amount: number };
    pending: { count: number; amount: number };
    rejected: { count: number; amount: number };
}

interface HourlyDataPoint {
    hour: string;
    amount: number;
}

interface PaymentMethod {
    name: string;
    count: number;
    amount: number;
    color: string;
}

interface TopupSummary {
    date: string;
    totalAmount: number;
    totalPeople: number;
    totalTransactions: number;
    allTransactions: number;
    averagePerTransaction: number;
    statusSummary: StatusSummary;
    hourlyData: HourlyDataPoint[];
    paymentMethods: PaymentMethod[];
    records: TopupRecord[];
}

interface WeeklyDataPoint {
    date: string;
    rawDate: string;
    dayOfWeek: number;
    amount: number;
    transactions: number;
}

// ─── Day-of-week constants ──────────────────────────────
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]; // Sun-Sat
const DAY_LABELS: Record<number, string> = {
    0: "อา",
    1: "จ",
    2: "อ",
    3: "พ",
    4: "พฤ",
    5: "ศ",
    6: "ส",
};
const DAY_FULL_LABELS: Record<number, string> = {
    0: "อาทิตย์",
    1: "จันทร์",
    2: "อังคาร",
    3: "พุธ",
    4: "พฤหัสบดี",
    5: "ศุกร์",
    6: "เสาร์",
};

// ─── Status Badge ───────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
        APPROVED: {
            icon: <CheckCircle className="h-3 w-3" />,
            label: "สำเร็จ",
            className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        },
        PENDING: {
            icon: <Clock className="h-3 w-3" />,
            label: "รอตรวจสอบ",
            className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        },
        REJECTED: {
            icon: <XCircle className="h-3 w-3" />,
            label: "ล้มเหลว",
            className: "bg-red-500/10 text-red-600 dark:text-red-400",
        },
    };
    const c = config[status] || config.PENDING;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
            {c.icon}
            {c.label}
        </span>
    );
}

// ─── Detail Modal ───────────────────────────────────────
function DetailModal({ record, onClose }: { record: TopupRecord; onClose: () => void }) {
    return (
        <button
            type="button"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 cursor-default"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            aria-label="ปิด modal"
        >
            <div
                className="relative max-w-xl w-full bg-card rounded-2xl shadow-2xl overflow-hidden animate-page-enter cursor-auto"
            >
                {/* Header */}
                <div className="relative px-6 py-5 bg-gradient-to-r from-sky-500 to-blue-500">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <h3 className="text-lg font-bold text-white">รายละเอียดการเติมเงิน</h3>
                    <p className="text-sm text-white/80 mt-0.5">{record.username}</p>
                </div>

                {/* Amount highlight */}
                <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground mb-0.5">จำนวนเงิน</p>
                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                            ฿{record.amount.toLocaleString()}
                        </p>
                    </div>
                    <StatusBadge status={record.status} />
                </div>

                {/* Info Grid */}
                <div className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-0.5">
                            <p className="text-xs font-medium text-muted-foreground">วันที่</p>
                            <p className="font-medium text-foreground">
                                {new Date(record.time).toLocaleString("th-TH", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                })}
                            </p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-xs font-medium text-muted-foreground">ผู้ใช้</p>
                            <p className="font-medium text-foreground">{record.username}</p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-xs font-medium text-muted-foreground">ธนาคาร/ช่องทาง</p>
                            <p className="font-medium text-foreground">{record.senderBank || "ไม่ระบุ"}</p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-xs font-medium text-muted-foreground">อ้างอิง (Ref)</p>
                            <p className="font-mono text-foreground text-xs break-all">
                                {record.transactionRef || "—"}
                            </p>
                        </div>
                        {record.status === "REJECTED" && (
                            <div className="col-span-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-0.5">เหตุผลที่ปฏิเสธ</p>
                                <p className="font-medium text-red-700 dark:text-red-300">
                                    {record.rejectReason || "ไม่ระบุ"}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Slip Image */}
                    {record.proofImage && (
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">รูปสลิป</p>
                            <img
                                src={record.proofImage}
                                alt="สลิปการโอนเงิน"
                                className="w-full max-h-[400px] object-contain rounded-xl border border-border bg-muted/20"
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-border bg-muted/20 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        ปิด
                    </button>
                </div>
            </div>
        </button>
    );
}

// ─── Chart Tooltips ─────────────────────────────────────
function AmountTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-xl" style={{ minWidth: 150 }}>
            <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
            <p className="text-sm font-bold text-foreground tabular-nums">
                ฿{payload[0].value.toLocaleString()}
            </p>
        </div>
    );
}

function TxnTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-xl" style={{ minWidth: 140 }}>
            <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
            <p className="text-sm font-bold text-foreground tabular-nums">
                {payload[0].value.toLocaleString()} รายการ
            </p>
        </div>
    );
}

function HourlyTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-xl" style={{ minWidth: 140 }}>
            <p className="text-xs font-medium text-muted-foreground mb-1">{label} น.</p>
            <p className="text-sm font-bold text-foreground tabular-nums">
                ฿{payload[0].value.toLocaleString()}
            </p>
        </div>
    );
}

// ─── Sort Arrow ─────────────────────────────────────────
type SortDir = "asc" | "desc" | null;
function SortIcon({ dir }: { dir: SortDir }) {
    if (!dir) return <ChevronUp className="h-3 w-3 opacity-20" />;
    return dir === "asc" ? (
        <ChevronUp className="h-3 w-3 text-primary" />
    ) : (
        <ChevronDown className="h-3 w-3 text-primary" />
    );
}

// ─── Component ──────────────────────────────────────────
interface DailyTopupSummaryProps {
    selectedDate?: string;
    startDate?: string;
    endDate?: string;
}

export function DailyTopupSummary({ selectedDate, startDate, endDate }: DailyTopupSummaryProps) {
    const [data, setData] = useState<TopupSummary | null>(null);
    const [weeklyData, setWeeklyData] = useState<WeeklyDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [detailRecord, setDetailRecord] = useState<TopupRecord | null>(null);

    // Day-of-week filter state (default = all selected)
    const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set(ALL_DAYS));

    // Table state
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [sortKey, setSortKey] = useState<string>("time");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;

    // Day filter helpers
    const toggleDay = (day: number) => {
        setSelectedDays((prev) => {
            const next = new Set(prev);
            if (next.has(day)) {
                next.delete(day);
            } else {
                next.add(day);
            }
            return next;
        });
    };
    const selectAllDays = () => setSelectedDays(new Set(ALL_DAYS));
    const clearAllDays = () => setSelectedDays(new Set());
    const allDaysSelected = selectedDays.size === ALL_DAYS.length;

    // Filtered weekly data by selected days
    const filteredWeeklyData = useMemo(
        () => weeklyData.filter((d) => selectedDays.has(d.dayOfWeek)),
        [weeklyData, selectedDays]
    );

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                // Build query string supporting range or single date
                let queryParams = "";
                if (startDate && endDate) {
                    queryParams = `?startDate=${startDate}&endDate=${endDate}`;
                } else if (selectedDate) {
                    queryParams = `?date=${selectedDate}`;
                }
                const [summaryRes, trendRes] = await Promise.all([
                    fetch(`/api/dashboard/topup-summary${queryParams}`),
                    fetch(`/api/dashboard/topup-trend${queryParams}`),
                ]);
                const summaryJson = await summaryRes.json();
                const trendJson = await trendRes.json();
                if (summaryJson.success) {
                    setData(summaryJson.data);
                }
                if (trendJson.success) {
                    setWeeklyData(trendJson.data);
                }
            } catch (err) {
                console.error("Failed to fetch topup summary:", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [selectedDate, startDate, endDate]);

    // Reset page when filter/search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, selectedDays]);

    // ── Filtered & Sorted records ───────────────────────
    const processedRecords = useMemo(() => {
        if (!data?.records) return [];
        let records = [...data.records];

        // Search
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            records = records.filter(
                (r) =>
                    r.username.toLowerCase().includes(q) ||
                    (r.transactionRef && r.transactionRef.toLowerCase().includes(q))
            );
        }

        // Filter by status
        if (statusFilter !== "ALL") {
            records = records.filter((r) => r.status === statusFilter);
        }

        // Filter by day of week
        if (selectedDays.size < ALL_DAYS.length) {
            records = records.filter((r) => selectedDays.has(new Date(r.time).getDay()));
        }

        // Sort
        if (sortKey && sortDir) {
            records.sort((a, b) => {
                let va: string | number = "";
                let vb: string | number = "";
                switch (sortKey) {
                    case "time":
                        va = a.time;
                        vb = b.time;
                        break;
                    case "username":
                        va = a.username.toLowerCase();
                        vb = b.username.toLowerCase();
                        break;
                    case "amount":
                        va = a.amount;
                        vb = b.amount;
                        break;
                    case "status":
                        va = a.status;
                        vb = b.status;
                        break;
                    case "senderBank":
                        va = (a.senderBank || "").toLowerCase();
                        vb = (b.senderBank || "").toLowerCase();
                        break;
                }
                if (va < vb) return sortDir === "asc" ? -1 : 1;
                if (va > vb) return sortDir === "asc" ? 1 : -1;
                return 0;
            });
        }

        return records;
    }, [data?.records, searchTerm, statusFilter, sortKey, sortDir, selectedDays]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(processedRecords.length / PAGE_SIZE));
    const paginatedRecords = processedRecords.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    // Toggle sort
    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir((prev) => (prev === "asc" ? "desc" : prev === "desc" ? null : "asc"));
            if (sortDir === null) setSortKey("");
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const getSortDir = (key: string): SortDir => (sortKey === key ? sortDir : null);

    // Format today's date in Thai
    const todayFormatted = new Date().toLocaleDateString("th-TH", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    // Payment methods total for percentage calc
    const methodsTotal = data?.paymentMethods?.reduce((s, m) => s + m.amount, 0) || 0;

    // ── Loading State ───────────────────────────────────
    if (isLoading) {
        return (
            <Card className="bg-card">
                <CardContent className="py-12 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                    <span className="ml-2 text-muted-foreground">กำลังโหลด...</span>
                </CardContent>
            </Card>
        );
    }

    // ── KPI Card Builder ────────────────────────────────
    const kpis = [
        {
            label: "ยอดเติมรวม",
            value: `฿${(data?.totalAmount ?? 0).toLocaleString()}`,
            icon: <Banknote className="h-5 w-5" />,
            color: "sky",
        },
        {
            label: "รายการทั้งหมด",
            value: `${data?.allTransactions ?? 0}`,
            sub: "รายการ",
            icon: <ArrowRightLeft className="h-5 w-5" />,
            color: "sky",
        },
        {
            label: "ผู้ใช้ที่เติม",
            value: `${data?.totalPeople ?? 0}`,
            sub: "คน",
            icon: <Users className="h-5 w-5" />,
            color: "sky",
        },
        {
            label: "เฉลี่ย/รายการ",
            value: `฿${(data?.averagePerTransaction ?? 0).toLocaleString()}`,
            icon: <Calculator className="h-5 w-5" />,
            color: "sky",
        },
        {
            label: "สำเร็จ",
            value: `${data?.statusSummary?.approved.count ?? 0}`,
            sub: `฿${(data?.statusSummary?.approved.amount ?? 0).toLocaleString()}`,
            icon: <CheckCircle className="h-5 w-5" />,
            color: "emerald",
        },
        {
            label: "รอตรวจสอบ",
            value: `${data?.statusSummary?.pending.count ?? 0}`,
            sub: `฿${(data?.statusSummary?.pending.amount ?? 0).toLocaleString()}`,
            icon: <AlertTriangle className="h-5 w-5" />,
            color: "amber",
            pulse: (data?.statusSummary?.pending.count ?? 0) > 0,
        },
        {
            label: "ล้มเหลว",
            value: `${data?.statusSummary?.rejected.count ?? 0}`,
            sub: `฿${(data?.statusSummary?.rejected.amount ?? 0).toLocaleString()}`,
            icon: <XCircle className="h-5 w-5" />,
            color: "red",
        },
    ];

    const colorMap: Record<string, { bg: string; iconBg: string; iconText: string; subText: string; border: string }> = {
        sky: {
            bg: "from-sky-500/10 to-sky-600/5",
            iconBg: "bg-sky-500/15 dark:bg-sky-500/20",
            iconText: "text-sky-700 dark:text-sky-400",
            subText: "text-sky-700 dark:text-sky-400",
            border: "border-sky-500/20",
        },
        emerald: {
            bg: "from-emerald-500/10 to-emerald-600/5",
            iconBg: "bg-emerald-500/15",
            iconText: "text-emerald-500",
            subText: "text-emerald-600 dark:text-emerald-400",
            border: "border-emerald-500/20",
        },
        indigo: {
            bg: "from-indigo-500/10 to-indigo-600/5",
            iconBg: "bg-indigo-500/15",
            iconText: "text-indigo-500",
            subText: "text-indigo-600 dark:text-indigo-400",
            border: "border-indigo-500/20",
        },
        blue: {
            bg: "from-blue-500/10 to-blue-600/5",
            iconBg: "bg-blue-500/15",
            iconText: "text-blue-500",
            subText: "text-blue-600 dark:text-blue-400",
            border: "border-blue-500/20",
        },
        violet: {
            bg: "from-violet-500/10 to-violet-600/5",
            iconBg: "bg-violet-500/15",
            iconText: "text-violet-500",
            subText: "text-violet-600 dark:text-violet-400",
            border: "border-violet-500/20",
        },
        amber: {
            bg: "from-amber-500/10 to-amber-600/5",
            iconBg: "bg-amber-500/15",
            iconText: "text-amber-500",
            subText: "text-amber-600 dark:text-amber-400",
            border: "border-amber-500/20",
        },
        red: {
            bg: "from-red-500/10 to-red-600/5",
            iconBg: "bg-red-500/15",
            iconText: "text-red-500",
            subText: "text-red-600 dark:text-red-400",
            border: "border-red-500/20",
        },
    };

    return (
        <div className="space-y-6">
            {/* Detail Modal */}
            {detailRecord && <DetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />}

            {/* Section title */}
            <h3 className="text-lg font-semibold text-foreground">
                สรุปเติมเงิน
            </h3>

            {/* ═══════════════════════════════════════════
                Top Row: 4 KPI cards 2×2 + Bar chart
               ═══════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                {/* Left: 4 main KPI cards in 2×2 */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-3">
                    {kpis.slice(0, 4).map((kpi) => {
                        const cm = colorMap[kpi.color] || colorMap.sky;
                        return (
                            <Card key={kpi.label} className="border-border/50 hover:shadow-md transition-shadow">
                                <CardContent className="p-4 flex items-start justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                                        <p className="text-2xl font-bold tracking-tight">
                                            {kpi.value}
                                            {kpi.sub && !kpi.sub.startsWith("฿") && (
                                                <span className="text-sm font-normal text-muted-foreground ml-1">{kpi.sub}</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cm.iconBg}`}>
                                        <span className={cm.iconText}>{kpi.icon}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Right: 7-day bar chart */}
                <Card className="lg:col-span-5 border-border/50">
                    <CardContent className="p-4">
                        {filteredWeeklyData.length > 0 && filteredWeeklyData.some((d) => d.transactions > 0) ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={filteredWeeklyData} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={30} />
                                    <RechartsTooltip content={<TxnTooltip />} />
                                    <Bar dataKey="transactions" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        {filteredWeeklyData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill="var(--chart-bar-fill)" fillOpacity={0.85} />
                                        ))}
                                        <LabelList
                                            dataKey="transactions"
                                            position="top"
                                            style={{ fontSize: "11px", fill: "var(--chart-bar-label)", fontWeight: 600 }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                                ไม่มีข้อมูล
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ═══════════════════════════════════════════
                Status KPI Cards
               ═══════════════════════════════════════════ */}
            <div className="grid grid-cols-3 gap-3">
                {kpis.slice(4).map((kpi) => {
                    const cm = colorMap[kpi.color] || colorMap.sky;
                    return (
                        <Card
                            key={kpi.label}
                            className={`bg-gradient-to-br ${cm.bg} ${cm.border} ${kpi.pulse ? "ring-2 ring-amber-500/30 animate-pulse" : ""}`}
                        >
                            <CardContent className="p-4 flex items-start justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                                    <p className="text-xl font-bold tracking-tight">{kpi.value}</p>
                                    {kpi.sub && (
                                        <p className={`text-xs ${cm.subText} font-medium`}>{kpi.sub}</p>
                                    )}
                                </div>
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cm.iconBg}`}>
                                    <span className={cm.iconText}>{kpi.icon}</span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* ═══════════════════════════════════════════
                ข้อมูลย้อนหลัง — Historical Area Chart
               ═══════════════════════════════════════════ */}
            <Card className="border-border/50">
                <CardContent className="p-6">
                    {/* Title + day-of-week filter */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h4 className="text-base font-semibold text-foreground">ข้อมูลย้อนหลัง</h4>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {ALL_DAYS.map((day) => (
                                <button
                                    key={day}
                                    onClick={() => toggleDay(day)}
                                    title={DAY_FULL_LABELS[day]}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${selectedDays.has(day)
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        }`}
                                >
                                    {selectedDays.has(day) && <Check className="h-3 w-3" />}
                                    {DAY_LABELS[day]}
                                </button>
                            ))}
                            <span className="mx-0.5 h-4 w-px bg-border" />
                            <button
                                onClick={allDaysSelected ? clearAllDays : selectAllDays}
                                className="px-2 py-1 rounded-md text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
                            >
                                {allDaysSelected ? "ล้าง" : "เลือกทั้งหมด"}
                            </button>
                        </div>
                    </div>

                    <div className="h-0.5 bg-gradient-to-r from-sky-500 to-blue-500 rounded-full mb-4" />

                    {/* Area Chart — Amount Trend */}
                    {filteredWeeklyData.length > 0 && filteredWeeklyData.some((d) => d.amount > 0) ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={filteredWeeklyData} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="topupAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--chart-area-gradient-from)" stopOpacity={0.5} />
                                        <stop offset="100%" stopColor="var(--chart-area-gradient-from)" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={45} />
                                <RechartsTooltip content={<AmountTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="var(--chart-area-stroke)"
                                    strokeWidth={2.5}
                                    fill="url(#topupAreaGradient)"
                                    dot={{ r: 4, fill: "var(--chart-dot-fill)", stroke: "var(--card)", strokeWidth: 2 }}
                                    activeDot={{ r: 6, fill: "var(--chart-dot-fill)", stroke: "var(--card)", strokeWidth: 2 }}
                                >
                                    <LabelList
                                        dataKey="amount"
                                        position="top"
                                        style={{ fontSize: "11px", fill: "var(--chart-area-label)", fontWeight: 600 }}
                                        formatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                                    />
                                </Area>
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                            ไม่มีข้อมูล
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════
                Charts Row — Hourly Trend + Payment Methods
               ═══════════════════════════════════════════ */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-5">
                {/* Hourly Trend Area Chart — 3 columns */}
                <Card className="lg:col-span-3 bg-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-sky-700 dark:text-sky-400">
                            แนวโน้มรายชั่วโมง
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data?.hourlyData && data.hourlyData.some((h) => h.amount > 0) ? (
                            <ResponsiveContainer width="100%" height={240}>
                                <AreaChart
                                    data={data.hourlyData}
                                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="hourlyGradientFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--chart-area-gradient-from)" stopOpacity={0.35} />
                                            <stop offset="50%" stopColor="var(--chart-area-stroke)" stopOpacity={0.12} />
                                            <stop offset="100%" stopColor="var(--chart-area-stroke)" stopOpacity={0.02} />
                                        </linearGradient>
                                        <linearGradient id="hourlyStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="var(--chart-area-gradient-from)" />
                                            <stop offset="100%" stopColor="var(--chart-area-stroke)" />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
                                    <XAxis dataKey="hour" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} dy={8} interval={2} />
                                    <YAxis tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)} stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={45} />
                                    <RechartsTooltip content={<HourlyTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="amount"
                                        stroke="url(#hourlyStrokeGrad)"
                                        strokeWidth={2.5}
                                        fill="url(#hourlyGradientFill)"
                                        dot={false}
                                        activeDot={{ r: 5, fill: "var(--chart-dot-fill)", stroke: "var(--card)", strokeWidth: 2 }}
                                        animationDuration={800}
                                        animationEasing="ease-out"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[240px] text-muted-foreground">
                                <TrendingUp className="h-10 w-10 opacity-20 mb-2" />
                                <p className="text-sm">ยังไม่มีข้อมูลเติมเงินวันนี้</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Payment Method Donut Chart — 2 columns */}
                <Card className="lg:col-span-2 bg-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-sky-700 dark:text-sky-400">
                            สัดส่วนช่องทาง
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data?.paymentMethods && data.paymentMethods.length > 0 ? (
                            <div className="flex flex-col items-center gap-4">
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie
                                            data={data.paymentMethods}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={75}
                                            paddingAngle={4}
                                            dataKey="amount"
                                            stroke="none"
                                        >
                                            {data.paymentMethods.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.color}
                                                    className="transition-opacity hover:opacity-80"
                                                />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            formatter={(value: number) => [`฿${value.toLocaleString()}`, "ยอดเงิน"]}
                                            contentStyle={{
                                                backgroundColor: "var(--color-card)",
                                                borderColor: "var(--color-border)",
                                                borderRadius: "12px",
                                                boxShadow: "0 10px 30px -5px rgba(0,0,0,0.15)",
                                                color: "var(--color-foreground)",
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="grid grid-cols-1 gap-2 w-full">
                                    {data.paymentMethods.map((m) => (
                                        <div key={m.name} className="flex items-center gap-2.5 text-sm">
                                            <div
                                                className="h-3 w-3 rounded-full shrink-0"
                                                style={{ backgroundColor: m.color }}
                                            />
                                            <span className="text-muted-foreground truncate">{m.name}</span>
                                            <span className="ml-auto font-medium tabular-nums text-xs">
                                                {methodsTotal > 0 ? ((m.amount / methodsTotal) * 100).toFixed(0) : 0}%
                                            </span>
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                ({m.count})
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[180px] text-muted-foreground">
                                <Wallet className="h-10 w-10 opacity-20 mb-2" />
                                <p className="text-sm">ยังไม่มีข้อมูล</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ═══════════════════════════════════════════
                Enhanced Detail Table
               ═══════════════════════════════════════════ */}
            <Card className="bg-card overflow-hidden">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-sky-700 dark:text-sky-400">
                        รายละเอียดการเติมเงิน
                    </CardTitle>
                    {/* Toolbar: Search + Filter */}
                    <div className="flex flex-col sm:flex-row gap-2 mt-2">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="ค้นหาด้วยชื่อผู้ใช้ หรือ Ref..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                        {/* Status Filter */}
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="pl-9 pr-8 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
                            >
                                <option value="ALL">ทุกสถานะ</option>
                                <option value="APPROVED">สำเร็จ</option>
                                <option value="PENDING">รอตรวจสอบ</option>
                                <option value="REJECTED">ล้มเหลว</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {processedRecords.length > 0 ? (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/50">
                                            <th
                                                className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                                                onClick={() => handleSort("time")}
                                            >
                                                <span className="inline-flex items-center gap-1">
                                                    วันที่ <SortIcon dir={getSortDir("time")} />
                                                </span>
                                            </th>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                                อ้างอิง
                                            </th>
                                            <th
                                                className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                                                onClick={() => handleSort("username")}
                                            >
                                                <span className="inline-flex items-center gap-1">
                                                    ผู้ใช้ <SortIcon dir={getSortDir("username")} />
                                                </span>
                                            </th>
                                            <th
                                                className="text-right px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                                                onClick={() => handleSort("amount")}
                                            >
                                                <span className="inline-flex items-center gap-1 justify-end">
                                                    จำนวนเงิน <SortIcon dir={getSortDir("amount")} />
                                                </span>
                                            </th>
                                            <th
                                                className="text-center px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                                                onClick={() => handleSort("status")}
                                            >
                                                <span className="inline-flex items-center gap-1">
                                                    สถานะ <SortIcon dir={getSortDir("status")} />
                                                </span>
                                            </th>
                                            <th
                                                className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                                                onClick={() => handleSort("senderBank")}
                                            >
                                                <span className="inline-flex items-center gap-1">
                                                    ธนาคาร/ช่องทาง <SortIcon dir={getSortDir("senderBank")} />
                                                </span>
                                            </th>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                                เหตุผล
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedRecords.map((record) => (
                                            <tr
                                                key={record.id}
                                                className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                                                onClick={() => setDetailRecord(record)}
                                            >
                                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {new Date(record.time).toLocaleString("th-TH", {
                                                            day: "2-digit",
                                                            month: "short",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[120px] truncate">
                                                    {record.transactionRef || "—"}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {record.username}
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                    +฿{record.amount.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <StatusBadge status={record.status} />
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted text-xs font-medium">
                                                        {record.senderBank || "ไม่ระบุ"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-red-600 dark:text-red-400 max-w-[160px] truncate">
                                                    {record.status === "REJECTED"
                                                        ? record.rejectReason || "ไม่ระบุ"
                                                        : "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                                <p className="text-xs text-muted-foreground">
                                    แสดง {(currentPage - 1) * PAGE_SIZE + 1}–
                                    {Math.min(currentPage * PAGE_SIZE, processedRecords.length)} จาก{" "}
                                    {processedRecords.length} รายการ
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                        .map((page, idx, arr) => (
                                            <span key={page}>
                                                {idx > 0 && arr[idx - 1] !== page - 1 && (
                                                    <span className="px-1 text-xs text-muted-foreground">…</span>
                                                )}
                                                <button
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition-colors ${page === currentPage
                                                        ? "bg-primary text-primary-foreground"
                                                        : "hover:bg-muted text-muted-foreground"
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            </span>
                                        ))}
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="py-8 text-center">
                            <Wallet className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="text-muted-foreground text-sm">
                                {searchTerm || statusFilter !== "ALL"
                                    ? "ไม่พบรายการที่ตรงกับเงื่อนไข"
                                    : "ยังไม่มีรายการเติมเงินวันนี้"}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
