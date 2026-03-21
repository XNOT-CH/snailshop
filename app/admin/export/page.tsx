"use client";

import { useState } from "react";
import {
    Download,
    Users,
    ShoppingCart,
    CreditCard,
    Gamepad2,
    Package,
    Calendar,
    FileSpreadsheet,
    CheckCircle2,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── types ──────────────────────────────────────────────────────────────────

type TableKey = "orders" | "users" | "topups" | "gacha" | "products";
type DownloadState = "idle" | "loading" | "done" | "error";

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

// ── table definitions ──────────────────────────────────────────────────────

const tables: TableConfig[] = [
    {
        key: "orders",
        label: "คำสั่งซื้อ",
        description: "รายการซื้อสินค้าทั้งหมด (id, userId, totalPrice, status, purchasedAt)",
        icon: ShoppingCart,
        color: "text-blue-600",
        gradient: "from-blue-500 to-blue-700",
        lightBg: "bg-blue-50",
        supportsDateRange: true,
    },
    {
        key: "users",
        label: "ผู้ใช้งาน",
        description: "ข้อมูลสมาชิกทั้งหมด (id, username, email, role, creditBalance, …)",
        icon: Users,
        color: "text-violet-600",
        gradient: "from-violet-500 to-purple-600",
        lightBg: "bg-violet-50",
        supportsDateRange: false,
    },
    {
        key: "topups",
        label: "ประวัติเติมเงิน",
        description: "รายการเติมเงินทั้งหมด (id, userId, amount, status, senderBank, …)",
        icon: CreditCard,
        color: "text-emerald-600",
        gradient: "from-emerald-500 to-teal-600",
        lightBg: "bg-emerald-50",
        supportsDateRange: true,
    },
    {
        key: "gacha",
        label: "บันทึกกาชา",
        description: "ประวัติการหมุนกาชาทั้งหมด (id, userId, rewardName, tier, costAmount, …)",
        icon: Gamepad2,
        color: "text-amber-600",
        gradient: "from-amber-500 to-orange-500",
        lightBg: "bg-amber-50",
        supportsDateRange: true,
    },
    {
        key: "products",
        label: "สินค้า",
        description: "รายการสินค้าทั้งหมด (id, name, category, price, isSold, …)",
        icon: Package,
        color: "text-rose-600",
        gradient: "from-rose-500 to-pink-600",
        lightBg: "bg-rose-50",
        supportsDateRange: false,
    },
];

// ── helpers ────────────────────────────────────────────────────────────────

function buildUrl(key: TableKey, from: string, to: string) {
    const url = new URL(`/api/admin/export`, globalThis.location.origin);
    url.searchParams.set("table", key);
    if (from) url.searchParams.set("from", from);
    if (to) url.searchParams.set("to", to);
    return url.toString();
}

async function downloadCsv(key: TableKey, from: string, to: string): Promise<void> {
    const res = await fetch(buildUrl(key, from, to));
    if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "ดาวน์โหลดล้มเหลว" }));
        throw new Error(body.message ?? "ดาวน์โหลดล้มเหลว");
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = /filename="([^"]+)"/.exec(disposition);
    const filename = match?.[1] ?? `${key}_export.csv`;
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
}

// ── card component ─────────────────────────────────────────────────────────

function ExportCard({
    config,
    from,
    to,
}: Readonly<{
    config: TableConfig;
    from: string;
    to: string;
}>) {
    const [state, setState] = useState<DownloadState>("idle");
    const [errMsg, setErrMsg] = useState("");
    const Icon = config.icon;

    async function handleDownload() {
        setState("loading");
        setErrMsg("");
        try {
            await downloadCsv(config.key, from, to);
            setState("done");
            setTimeout(() => setState("idle"), 3000);
        } catch (e) {
            setErrMsg(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
            setState("error");
            setTimeout(() => setState("idle"), 4000);
        }
    }

    let btnClass = "bg-[#1a56db] hover:bg-[#1448c0]";
    if (state === "done") btnClass = "bg-emerald-600 hover:bg-emerald-700";
    else if (state === "error") btnClass = "bg-red-600 hover:bg-red-700";

    return (
        <div className="relative overflow-hidden bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
            {/* Color bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradient}`} />

            <div className="p-5 pt-6 flex-1">
                <div className="flex items-start gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.lightBg}`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-foreground">{config.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{config.description}</p>

                        {!config.supportsDateRange && (
                            <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 rounded-md px-2 py-0.5 border border-amber-200 dark:border-amber-700">
                                <Calendar className="h-3 w-3" />
                                ส่งออกทั้งหมด (ไม่รองรับช่วงวันที่)
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-5 pb-5">
                {state === "error" && (
                    <div className="mb-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2 border border-red-200 dark:border-red-800">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {errMsg}
                    </div>
                )}

                <Button
                    onClick={handleDownload}
                    disabled={state === "loading"}
                    className={`w-full gap-2 font-medium ${btnClass}`}
                >
                    {state === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
                    {state === "done" && <CheckCircle2 className="h-4 w-4" />}
                    {state === "error" && <Download className="h-4 w-4" />}
                    {state === "idle" && <Download className="h-4 w-4" />}
                    
                    {state === "loading" && "กำลังโหลด…"}
                    {state === "done" && "ดาวน์โหลดสำเร็จ!"}
                    {state === "error" && "ลองอีกครั้ง"}
                    {state === "idle" && `ดาวน์โหลด ${config.label}.csv`}
                </Button>
            </div>
        </div>
    );
}

// ── main page ──────────────────────────────────────────────────────────────

export default function AdminExportPage() {
    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = today.slice(0, 8) + "01";

    const [from, setFrom] = useState(firstOfMonth);
    const [to, setTo] = useState(today);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a56db]">
                    <FileSpreadsheet className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-foreground">ส่งออกข้อมูล (CSV)</h1>
                    <p className="text-sm text-muted-foreground">
                        ดาวน์โหลดข้อมูลพร้อม BOM — เปิดใน Excel ได้ทันทีโดยดับเบิลคลิก
                    </p>
                </div>
            </div>

            {/* BOM info banner */}
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <div>
                    <span className="font-semibold">UTF-8 BOM ถูกเพิ่มอัตโนมัติ</span>{" "}
                    — ไฟล์ CSV ที่ดาวน์โหลดจะแสดงภาษาไทยถูกต้องเมื่อเปิดด้วย Excel (Windows)
                    โดยไม่ต้องตั้งค่าเพิ่มเติม
                </div>
            </div>

            {/* Date range filter */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">กรองตามช่วงวันที่</span>
                    <span className="text-xs text-muted-foreground">(ใช้กับ: คำสั่งซื้อ, เติมเงิน, กาชา)</span>
                </div>
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[160px]">
                        <Label className="text-xs text-muted-foreground mb-1 block">วันที่เริ่มต้น</Label>
                        <Input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="h-9 text-sm"
                        />
                    </div>
                    <div className="flex-1 min-w-[160px]">
                        <Label className="text-xs text-muted-foreground mb-1 block">วันที่สิ้นสุด</Label>
                        <Input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="h-9 text-sm"
                        />
                    </div>
                    <div className="flex items-end">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs"
                            onClick={() => { setFrom(firstOfMonth); setTo(today); }}
                        >
                            รีเซ็ต
                        </Button>
                    </div>
                </div>
            </div>

            {/* Export cards grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {tables.map((t) => (
                    <ExportCard key={t.key} config={t} from={from} to={to} />
                ))}
            </div>

            {/* Footer note */}
            <p className="text-center text-xs text-muted-foreground">
                สูงสุด 50,000 แถวต่อการส่งออก • ข้อมูลเรียงจากใหม่ไปเก่า
            </p>
        </div>
    );
}
