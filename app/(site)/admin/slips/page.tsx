"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CalendarClock, ChevronLeft, ChevronRight, FileCheck, Search, Ticket, Wallet } from "lucide-react";
import { SpinnerScreen } from "@/components/SpinnerScreen";
import { TopupCodeUsageTable, type TopupCodeUsage } from "@/components/admin/TopupCodeUsageTable";
import { showError } from "@/lib/swal";
import { cn } from "@/lib/utils";

interface Summary {
    today: { count: number; amount: number };
    allTime: { count: number; amount: number };
    activeCodeCount: number;
}

interface Pagination {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
}

const STATUS_FILTERS = [
    { value: "ALL", label: "ทั้งหมด" },
    { value: "COMPLETED", label: "สำเร็จ" },
    { value: "REVERTED", label: "ถูกย้อนกลับ" },
];

export default function AdminSlipsPage() {
    const [usages, setUsages] = useState<TopupCodeUsage[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("ALL");
    const [page, setPage] = useState(1);

    const fetchUsages = useCallback(async (params: { search: string; status: string; page: number }) => {
        try {
            const query = new URLSearchParams({
                search: params.search,
                status: params.status,
                page: String(params.page),
                pageSize: "20",
            });
            const response = await fetch(`/api/admin/slips?${query.toString()}`);
            const data = await response.json();

            if (data.success) {
                setUsages(data.data.records);
                setSummary(data.data.summary);
                setPagination(data.data.pagination);
            } else {
                showError(data.message || "ไม่สามารถโหลดข้อมูลได้");
            }
        } catch (error) {
            console.error("[TOPUP_CODE_USAGES_FETCH]", error);
            showError("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchUsages({ search, status, page });
        }, search ? 300 : 0);

        return () => clearTimeout(timeout);
    }, [fetchUsages, search, status, page]);

    if (isLoading && !summary) {
        return <SpinnerScreen label="กำลังโหลดข้อมูลการใช้โค้ด..." />;
    }

    return (
        <div className="admin-slips-page space-y-6">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                    <FileCheck className="h-6 w-6 text-[#145de7]" />
                    ตรวจสอบการใช้โค้ดเติมเงิน
                </h1>
                <p className="mt-1 text-muted-foreground">ดูประวัติคนที่ใช้โค้ดเติมเครดิต ว่าใครใช้โค้ดไหน เมื่อไหร่ ได้เท่าไหร่</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="admin-slips-summary-card rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] p-5 shadow-sm dark:border-[#2d4362] dark:bg-[linear-gradient(135deg,rgba(15,25,39,0.98)_0%,rgba(20,32,49,0.94)_100%)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                            <CalendarClock className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-[#9ab0cb]">ใช้โค้ดวันนี้</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-[#eef4ff]">{summary?.today.count ?? 0} ครั้ง</p>
                            <p className="text-xs text-slate-400 dark:text-[#8399b8]">+฿{(summary?.today.amount ?? 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="admin-slips-summary-card rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_100%)] p-5 shadow-sm dark:border-[#2d4362] dark:bg-[linear-gradient(135deg,rgba(15,25,39,0.98)_0%,rgba(20,32,49,0.94)_100%)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-[#9ab0cb]">ยอดเครดิตแจกไปทั้งหมด</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-[#eef4ff]">฿{(summary?.allTime.amount ?? 0).toLocaleString()}</p>
                            <p className="text-xs text-slate-400 dark:text-[#8399b8]">{summary?.allTime.count ?? 0} ครั้งทั้งหมด</p>
                        </div>
                    </div>
                </div>
                <div className="admin-slips-summary-card rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_100%)] p-5 shadow-sm dark:border-[#2d4362] dark:bg-[linear-gradient(135deg,rgba(15,25,39,0.98)_0%,rgba(20,32,49,0.94)_100%)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm">
                            <Ticket className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-[#9ab0cb]">โค้ดเติมเครดิตที่ใช้งานอยู่</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-[#eef4ff]">{summary?.activeCodeCount ?? 0} โค้ด</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm dark:bg-zinc-900">
                <div className="flex flex-col gap-3 border-b border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-[#145de7]">
                            <FileCheck className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="font-bold text-foreground">ประวัติการใช้โค้ด ({pagination?.totalRecords ?? 0})</span>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                            <input
                                type="text"
                                placeholder="ค้นหา user หรือโค้ด..."
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                                className="h-9 w-full rounded-xl border border-border bg-muted pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-blue-500 focus:bg-card focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-500/20 sm:w-56"
                            />
                        </div>

                        <div className="flex gap-1.5">
                            {STATUS_FILTERS.map((filter) => (
                                <button
                                    key={filter.value}
                                    type="button"
                                    onClick={() => {
                                        setStatus(filter.value);
                                        setPage(1);
                                    }}
                                    className={cn(
                                        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                                        status === filter.value
                                            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                            : "border-border bg-muted text-muted-foreground hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                                    )}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {usages.length === 0 ? (
                    <div className="py-14 text-center text-muted-foreground">
                        <AlertCircle className="mx-auto mb-3 h-12 w-12 opacity-30" />
                        <p>ยังไม่มีการใช้โค้ดเติมเงิน</p>
                    </div>
                ) : (
                    <>
                        <TopupCodeUsageTable usages={usages} />

                        {pagination && pagination.totalPages > 1 ? (
                            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm text-muted-foreground">
                                <p>
                                    หน้า {pagination.page} จาก {pagination.totalPages} ({pagination.totalRecords} รายการ)
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                                        disabled={pagination.page === 1}
                                        aria-label="หน้าก่อนหน้า"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card disabled:opacity-40"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                                        disabled={pagination.page === pagination.totalPages}
                                        aria-label="หน้าถัดไป"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card disabled:opacity-40"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}
