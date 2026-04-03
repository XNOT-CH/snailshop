"use client";

import { useEffect, useRef, useState } from "react";
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    CreditCard,
    Download,
    FileSpreadsheet,
    Gamepad2,
    Loader2,
    Package,
    ShoppingCart,
    Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateInTimeZone, getFirstDayOfMonthInTimeZone } from "@/lib/utils/date";

type TableKey = "orders" | "users" | "topups" | "gacha" | "products";
type DownloadState = "idle" | "loading" | "done" | "error";

const EXPORT_ROW_LIMIT = 50000;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

interface TableConfig {
    key: TableKey;
    label: string;
    description: string;
    icon: React.ElementType;
    color: string;
    gradient: string;
    lightBg: string;
    supportsDateRange: boolean;
}

interface DateRange {
    from: string;
    to: string;
}

const tables: TableConfig[] = [
    {
        key: "orders",
        label: "คำสั่งซื้อ",
        description: "รายการคำสั่งซื้อทั้งหมด (id, userId, totalPrice, status, purchasedAt)",
        icon: ShoppingCart,
        color: "text-blue-600",
        gradient: "from-blue-500 to-blue-700",
        lightBg: "bg-blue-50",
        supportsDateRange: true,
    },
    {
        key: "users",
        label: "ผู้ใช้งาน",
        description: "ข้อมูลสมาชิกทั้งหมด (id, username, email, role, creditBalance, ...)",
        icon: Users,
        color: "text-violet-600",
        gradient: "from-violet-500 to-purple-600",
        lightBg: "bg-violet-50",
        supportsDateRange: false,
    },
    {
        key: "topups",
        label: "ประวัติเติมเงิน",
        description: "รายการเติมเงินทั้งหมด (id, userId, amount, status, senderBank, ...)",
        icon: CreditCard,
        color: "text-emerald-600",
        gradient: "from-emerald-500 to-teal-600",
        lightBg: "bg-emerald-50",
        supportsDateRange: true,
    },
    {
        key: "gacha",
        label: "บันทึกกาชา",
        description: "ประวัติการหมุนกาชาทั้งหมด (id, userId, rewardName, tier, costAmount, ...)",
        icon: Gamepad2,
        color: "text-amber-600",
        gradient: "from-amber-500 to-orange-500",
        lightBg: "bg-amber-50",
        supportsDateRange: true,
    },
    {
        key: "products",
        label: "สินค้า",
        description: "รายการสินค้าทั้งหมด (id, name, category, price, isSold, ...)",
        icon: Package,
        color: "text-rose-600",
        gradient: "from-rose-500 to-pink-600",
        lightBg: "bg-rose-50",
        supportsDateRange: false,
    },
];

function isValidDateOnly(value: string | null): value is string {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getDefaultDateRange(): DateRange {
    const now = new Date();

    return {
        from: getFirstDayOfMonthInTimeZone(now),
        to: formatDateInTimeZone(now),
    };
}

function getRecentDateRange(days: number): DateRange {
    const now = new Date();
    const fromDate = new Date(now.getTime() - (days - 1) * DAY_IN_MS);

    return {
        from: formatDateInTimeZone(fromDate),
        to: formatDateInTimeZone(now),
    };
}

function readDateRangeFromUrl(): DateRange {
    const defaults = getDefaultDateRange();

    if (typeof window === "undefined") {
        return defaults;
    }

    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    const to = params.get("to");

    return {
        from: isValidDateOnly(from) ? from : defaults.from,
        to: isValidDateOnly(to) ? to : defaults.to,
    };
}

function buildUrl(key: TableKey, from: string, to: string) {
    const url = new URL("/api/admin/export", window.location.origin);
    url.searchParams.set("table", key);

    if (from) {
        url.searchParams.set("from", from);
    }

    if (to) {
        url.searchParams.set("to", to);
    }

    return url.toString();
}

async function downloadCsv(key: TableKey, from: string, to: string): Promise<void> {
    const response = await fetch(buildUrl(key, from, to));

    if (!response.ok) {
        const body = await response.json().catch(() => ({ message: "ดาวน์โหลดล้มเหลว" }));
        throw new Error(body.message ?? "ดาวน์โหลดล้มเหลว");
    }

    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const match = /filename="([^"]+)"/.exec(disposition);
    const filename = match?.[1] ?? `${key}_export.csv`;
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
}

function ExportCard({
    config,
    from,
    to,
    dateRangeError,
}: Readonly<{
    config: TableConfig;
    from: string;
    to: string;
    dateRangeError: string | null;
}>) {
    const [state, setState] = useState<DownloadState>("idle");
    const [errMsg, setErrMsg] = useState("");
    const Icon = config.icon;
    const isDisabled = state === "loading" || (config.supportsDateRange && Boolean(dateRangeError));
    const statusMessage =
        state === "loading"
            ? `กำลังดาวน์โหลด ${config.label}…`
            : state === "done"
              ? `ดาวน์โหลด ${config.label} สำเร็จ`
              : state === "error"
                ? errMsg || `ดาวน์โหลด ${config.label} ไม่สำเร็จ`
                : "";

    async function handleDownload() {
        if (config.supportsDateRange && dateRangeError) {
            setErrMsg(dateRangeError);
            setState("error");
            setTimeout(() => setState("idle"), 4000);
            return;
        }

        setState("loading");
        setErrMsg("");

        try {
            await downloadCsv(config.key, from, to);
            setState("done");
            setTimeout(() => setState("idle"), 3000);
        } catch (error) {
            setErrMsg(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
            setState("error");
            setTimeout(() => setState("idle"), 4000);
        }
    }

    let btnClass = "bg-[#1a56db] hover:bg-[#1448c0]";
    if (state === "done") btnClass = "bg-emerald-600 hover:bg-emerald-700";
    else if (state === "error") btnClass = "bg-red-600 hover:bg-red-700";

    return (
        <div className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow duration-300 hover:shadow-md">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradient}`} />

            <div className="flex-1 p-5 pt-6">
                <div className="flex items-start gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.lightBg}`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-foreground">{config.label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{config.description}</p>

                        {!config.supportsDateRange ? (
                            <p className="mt-2 inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-600 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                <Calendar className="h-3 w-3" />
                                ส่งออกทั้งหมด (ไม่รองรับช่วงวันที่)
                            </p>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="px-5 pb-5">
                <div className="sr-only" aria-live="polite">
                    {statusMessage}
                </div>

                {state === "error" ? (
                    <div
                        role="alert"
                        aria-live="polite"
                        className="mb-2 flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
                    >
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {errMsg}
                    </div>
                ) : null}

                <Button
                    onClick={handleDownload}
                    disabled={isDisabled}
                    className={`w-full gap-2 font-medium ${btnClass}`}
                >
                    {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {state === "done" ? <CheckCircle2 className="h-4 w-4" /> : null}
                    {state === "error" ? <Download className="h-4 w-4" /> : null}
                    {state === "idle" ? <Download className="h-4 w-4" /> : null}

                    {state === "loading" ? "กำลังดาวน์โหลด…" : null}
                    {state === "done" ? "ดาวน์โหลดสำเร็จ" : null}
                    {state === "error" ? "ลองอีกครั้ง" : null}
                    {state === "idle" ? `ดาวน์โหลด ${config.label}.csv` : null}
                </Button>
            </div>
        </div>
    );
}

export default function AdminExportPage() {
    const monthRange = getDefaultDateRange();
    const todayRange = getRecentDateRange(1);
    const sevenDayRange = getRecentDateRange(7);
    const thirtyDayRange = getRecentDateRange(30);
    const [from, setFrom] = useState(monthRange.from);
    const [to, setTo] = useState(monthRange.to);
    const shouldSkipInitialUrlWrite = useRef(true);
    const dateRangeError = from > to ? "วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด" : null;

    useEffect(() => {
        const syncFromUrl = () => {
            const nextRange = readDateRangeFromUrl();
            setFrom(nextRange.from);
            setTo(nextRange.to);
        };

        syncFromUrl();
        window.addEventListener("popstate", syncFromUrl);
        return () => window.removeEventListener("popstate", syncFromUrl);
    }, []);

    useEffect(() => {
        if (shouldSkipInitialUrlWrite.current) {
            shouldSkipInitialUrlWrite.current = false;
            return;
        }

        const url = new URL(window.location.href);
        url.searchParams.set("from", from);
        url.searchParams.set("to", to);

        window.history.replaceState(window.history.state, "", `${url.pathname}?${url.searchParams.toString()}`);
    }, [from, to]);

    function applyRange(range: DateRange) {
        setFrom(range.from);
        setTo(range.to);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a56db]">
                    <FileSpreadsheet className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-foreground">ส่งออกข้อมูล (CSV)</h1>
                    <p className="text-sm text-muted-foreground">
                        ดาวน์โหลดข้อมูลพร้อม BOM เพื่อเปิดใน Excel ได้ทันทีโดยไม่ต้องตั้งค่าเพิ่ม
                    </p>
                </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <div>
                    <span className="font-semibold">UTF-8 BOM ถูกเพิ่มอัตโนมัติ</span>{" "}
                    ไฟล์ CSV ที่ดาวน์โหลดจะแสดงภาษาไทยถูกต้องเมื่อเปิดด้วย Excel (Windows)
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">กรองตามช่วงวันที่</span>
                    <span className="text-xs text-muted-foreground">(ใช้กับ: คำสั่งซื้อ, เติมเงิน, กาชา)</span>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => applyRange(todayRange)}>
                        วันนี้
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => applyRange(sevenDayRange)}>
                        7 วันล่าสุด
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => applyRange(thirtyDayRange)}>
                        30 วันล่าสุด
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => applyRange(monthRange)}>
                        เดือนนี้
                    </Button>
                </div>

                <div className="flex flex-wrap gap-4">
                    <div className="min-w-[160px] flex-1">
                        <Label htmlFor="export-from" className="mb-1 block text-xs text-muted-foreground">
                            วันที่เริ่มต้น
                        </Label>
                        <Input
                            id="export-from"
                            name="from"
                            type="date"
                            value={from}
                            max={to || undefined}
                            aria-invalid={Boolean(dateRangeError)}
                            onChange={(event) => setFrom(event.target.value)}
                            className="h-9 text-sm tabular-nums"
                        />
                    </div>
                    <div className="min-w-[160px] flex-1">
                        <Label htmlFor="export-to" className="mb-1 block text-xs text-muted-foreground">
                            วันที่สิ้นสุด
                        </Label>
                        <Input
                            id="export-to"
                            name="to"
                            type="date"
                            value={to}
                            min={from || undefined}
                            aria-invalid={Boolean(dateRangeError)}
                            onChange={(event) => setTo(event.target.value)}
                            className="h-9 text-sm tabular-nums"
                        />
                    </div>
                    <div className="flex items-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs"
                            onClick={() => applyRange(monthRange)}
                        >
                            รีเซ็ต
                        </Button>
                    </div>
                </div>

                {dateRangeError ? (
                    <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                        {dateRangeError}
                    </div>
                ) : null}

                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    ส่งออกได้สูงสุด {EXPORT_ROW_LIMIT.toLocaleString()} แถวต่อไฟล์ ถ้าข้อมูลเยอะให้แบ่งช่วงวันที่แล้วส่งออกหลายครั้ง
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {tables.map((table) => (
                    <ExportCard
                        key={table.key}
                        config={table}
                        from={from}
                        to={to}
                        dateRangeError={dateRangeError}
                    />
                ))}
            </div>

            <p className="text-center text-xs text-muted-foreground">
                ข้อมูลในไฟล์จะเรียงจากใหม่ไปเก่า และช่วงวันที่ปัจจุบันถูกเก็บไว้ใน URL เพื่อแชร์หรือลองใหม่ได้ทันที
            </p>
        </div>
    );
}
