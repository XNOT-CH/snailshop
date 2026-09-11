"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
    ArrowDownWideNarrow,
    Clock,
    Copy,
    CopyPlus,
    Link2,
    MoreVertical,
    Pencil,
    RefreshCw,
    Save,
    Search,
    Trash2,
    X,
} from "lucide-react";
import { SpinnerScreen } from "@/components/SpinnerScreen";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { PERMISSIONS } from "@/lib/permissions";
import { API_ROUTES } from "@/lib/constants/apiRoutes";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { showConfirm, showError, showSuccess } from "@/lib/swal";
import { cn } from "@/lib/utils";

interface InviteCodeRow {
    id: string;
    code: string;
    label: string;
    note: string | null;
    destination: string;
    createdAt: string;
    deletedAt: string | null;
    signups: number;
    topupTotal: number;
}

type SortKey = "signups" | "topupTotal" | "createdAt";

// Stopped links stay in the table so their numbers can still be read; they are
// just not what the page opens on.
type StatusFilter = "live" | "stopped" | "all";

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
    { key: "live", label: "ใช้งาน" },
    { key: "stopped", label: "ปิดแล้ว" },
    { key: "all", label: "ทั้งหมด" },
];

const PAGE_SIZE = 10;

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "signups", label: "สมัครมากสุด" },
    { key: "topupTotal", label: "ยอดเติมมากสุด" },
    { key: "createdAt", label: "สร้างล่าสุด" },
];

const DESTINATION_OPTIONS = [
    { value: "/shop", label: "หน้าร้านค้า" },
    { value: "/", label: "หน้าแรก" },
    { value: "/register", label: "หน้าสมัครสมาชิก" },
    { value: "/gachapons", label: "หน้ากาชา" },
    { value: "/season-pass", label: "หน้า Season Pass" },
];

const EMPTY_FORM = {
    code: "",
    label: "",
    note: "",
    destination: "/shop",
};

function randomCode() {
    // Ambiguous characters left out: these get read off a screen and typed by
    // hand often enough that 0/O and 1/I turn into support messages.
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from(
        { length: 6 },
        () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");
}

function formatCreatedAt(value: string) {
    const parsed = new Date(value.replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) return value;
    return format(parsed, "d MMM yyyy HH:mm", { locale: th });
}

export default function AdminInviteCodesPage() {
    const permissions = useAdminPermissions();
    const canEdit = permissions.includes(PERMISSIONS.INVITE_EDIT);

    const [rows, setRows] = useState<InviteCodeRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [range, setRange] = useState<DateRange | undefined>();
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("signups");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("live");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM, code: "" });
    const [isSaving, setIsSaving] = useState(false);
    const [origin, setOrigin] = useState("");

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const fetchRows = useCallback(async (selectedRange: DateRange | undefined) => {
        try {
            const query = new URLSearchParams();
            if (selectedRange?.from) query.set("startDate", format(selectedRange.from, "yyyy-MM-dd"));
            if (selectedRange?.to) query.set("endDate", format(selectedRange.to, "yyyy-MM-dd"));
            // Both kinds come down in one request; the filter below is local so
            // switching it does not cost a round trip.
            query.set("includeDeleted", "1");

            const suffix = query.toString() ? `?${query.toString()}` : "";
            const response = await fetch(`${API_ROUTES.ADMIN_INVITE_CODES}${suffix}`);
            const data = await response.json();

            if (data.success) {
                setRows(data.data);
            } else {
                showError(data.message || "ไม่สามารถโหลดข้อมูลได้");
            }
        } catch (error) {
            console.error("[INVITE_CODES_FETCH]", error);
            showError("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRows(range);
    }, [fetchRows, range]);

    const visibleRows = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        const byStatus = rows.filter((row) => {
            if (statusFilter === "all") return true;
            return statusFilter === "stopped" ? row.deletedAt !== null : row.deletedAt === null;
        });
        const matched = keyword
            ? byStatus.filter(
                  (row) =>
                      row.code.toLowerCase().includes(keyword) ||
                      row.label.toLowerCase().includes(keyword) ||
                      (row.note ?? "").toLowerCase().includes(keyword),
              )
            : byStatus;

        return [...matched].sort((a, b) => {
            if (sortKey === "createdAt") return b.createdAt.localeCompare(a.createdAt);
            return b[sortKey] - a[sortKey] || b.signups - a.signups;
        });
    }, [rows, search, sortKey, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageRows = visibleRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const firstShown = visibleRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const lastShown = Math.min(currentPage * PAGE_SIZE, visibleRows.length);

    const totals = useMemo(
        () =>
            visibleRows.reduce(
                (acc, row) => ({
                    signups: acc.signups + row.signups,
                    topupTotal: acc.topupTotal + row.topupTotal,
                }),
                { signups: 0, topupTotal: 0 },
            ),
        [visibleRows],
    );

    const inviteUrl = (code: string) => `${origin}/r/${code}`;

    const copyLink = async (code: string) => {
        try {
            await navigator.clipboard.writeText(inviteUrl(code));
            showSuccess(`คัดลอกลิงก์ของ ${code} แล้ว`);
        } catch {
            showError("ไม่สามารถคัดลอกลิงก์ได้");
        }
    };

    const refresh = async () => {
        setIsRefreshing(true);
        await fetchRows(range);
        setIsRefreshing(false);
    };

    const resetForm = () => {
        setEditingId(null);
        setForm({ ...EMPTY_FORM, code: "" });
    };

    const startEdit = (row: InviteCodeRow) => {
        setEditingId(row.id);
        setForm({
            code: row.code,
            label: row.label,
            note: row.note ?? "",
            destination: row.destination,
        });
        // The form lives at the top of the page; scroll it into view so the
        // click does not look like it did nothing.
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // Same channel settings, fresh code — the usual way a second link for the
    // same promoter gets made. Nothing is written until บันทึก is pressed.
    const duplicateRow = (row: InviteCodeRow) => {
        setEditingId(null);
        setForm({
            code: randomCode(),
            label: `${row.label} (สำเนา)`,
            note: row.note ?? "",
            destination: row.destination,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const saveForm = async () => {
        if (!form.code.trim() || !form.label.trim()) {
            showError("กรุณากรอกรหัสคำเชิญและชื่อช่องทาง");
            return;
        }

        setIsSaving(true);
        try {
            const isEditing = editingId !== null;
            const note = form.note.trim() ? form.note : null;
            const payload = isEditing
                ? { label: form.label, note, destination: form.destination }
                : {
                      code: form.code,
                      label: form.label,
                      note,
                      destination: form.destination,
                  };

            const response = await fetchWithCsrf(
                isEditing ? API_ROUTES.adminInviteCode(editingId) : API_ROUTES.ADMIN_INVITE_CODES,
                {
                    method: isEditing ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );
            const data = await response.json();

            if (!data.success) {
                showError(data.message || "บันทึกไม่สำเร็จ");
                return;
            }

            showSuccess(data.message);
            resetForm();
            await fetchRows(range);
        } catch (error) {
            console.error("[INVITE_CODE_SAVE]", error);
            showError("บันทึกไม่สำเร็จ");
        } finally {
            setIsSaving(false);
        }
    };

    const removeIds = async (ids: string[]) => {
        let removed = 0;
        for (const id of ids) {
            try {
                const response = await fetchWithCsrf(API_ROUTES.adminInviteCode(id), {
                    method: "DELETE",
                });
                const data = await response.json();
                if (data.success) removed += 1;
            } catch (error) {
                console.error("[INVITE_CODE_DELETE]", error);
            }
        }
        return removed;
    };

    const deleteRow = async (row: InviteCodeRow) => {
        const confirmed = await showConfirm(
            `ลบลิงก์ ${row.code}?`,
            'ลิงก์นี้จะใช้ไม่ได้อีก และย้ายไปอยู่ในรายการ "ปิดแล้ว" ยอดสมัครและยอดเติมเงินที่นับไว้ยังดูได้ แต่โค้ดนี้จะเอากลับมาใช้ซ้ำไม่ได้',
            "ลบเลย",
        );
        if (!confirmed) return;

        const removed = await removeIds([row.id]);
        if (removed === 0) {
            showError("ลบไม่สำเร็จ");
            return;
        }

        showSuccess("ลบลิงก์คำเชิญแล้ว");
        setSelected(new Set());
        if (editingId === row.id) resetForm();
        await fetchRows(range);
    };

    const deleteSelected = async () => {
        const ids = [...selected];
        if (ids.length === 0) return;

        const confirmed = await showConfirm(
            `ลบ ${ids.length} ลิงก์ที่เลือก?`,
            'ลิงก์เหล่านี้จะใช้ไม่ได้อีก และย้ายไปอยู่ในรายการ "ปิดแล้ว" ยอดสมัครและยอดเติมเงินที่นับไว้ยังดูได้ แต่โค้ดเหล่านี้จะเอากลับมาใช้ซ้ำไม่ได้',
            "ลบเลย",
        );
        if (!confirmed) return;

        const removed = await removeIds(ids);
        if (removed === 0) {
            showError("ลบไม่สำเร็จ");
        } else if (removed < ids.length) {
            // Deleted one at a time, so a partial result is possible and has to
            // be reported honestly rather than as a clean success.
            showError(`ลบได้ ${removed} จาก ${ids.length} ลิงก์`);
        } else {
            showSuccess(`ลบ ${removed} ลิงก์แล้ว`);
        }

        setSelected(new Set());
        resetForm();
        await fetchRows(range);
    };

    const toggleSelected = (id: string) => {
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // A stopped link has nothing left to delete, so it is never selectable.
    const selectablePageRows = pageRows.filter((row) => row.deletedAt === null);
    const allOnPageSelected =
        selectablePageRows.length > 0 && selectablePageRows.every((row) => selected.has(row.id));

    const toggleSelectPage = () => {
        setSelected((current) => {
            const next = new Set(current);
            if (allOnPageSelected) selectablePageRows.forEach((row) => next.delete(row.id));
            else selectablePageRows.forEach((row) => next.add(row.id));
            return next;
        });
    };

    if (isLoading) {
        return <SpinnerScreen label="กำลังโหลดลิงก์คำเชิญ..." />;
    }

    return (
        <div className="admin-invite-codes-page space-y-4">
            {/* ฟอร์มสร้าง / แก้ไข */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#145de7]/10 text-[#145de7] ring-1 ring-[#145de7]/30 dark:bg-[#145de7]/20">
                        <Link2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-[#145de7] dark:text-[#6ea2ff]">
                            รหัสคำเชิญ
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {editingId ? "แก้ไขรหัสที่เลือกไว้" : "สร้างลิงก์ให้คนโปรโมท แล้วดูว่าช่องทางไหนพาคนสมัครและเติมเงินเข้ามา"}
                        </p>
                    </div>
                </div>

                <div className="space-y-4 px-5 py-5">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="invite-code" className="gap-1.5">
                                รหัสคำเชิญ
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden="true" />
                            </Label>
                            <Input
                                id="invite-code"
                                value={form.code}
                                disabled={!canEdit || editingId !== null}
                                onChange={(event) =>
                                    setForm({ ...form, code: event.target.value.toUpperCase() })
                                }
                                placeholder="เช่น SNAILSHOP"
                                className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                                {editingId
                                    ? "รหัสแก้ไม่ได้ เพราะลิงก์ถูกแจกออกไปแล้วและมีผู้สมัครผูกอยู่"
                                    : `ลิงก์ที่ได้: ${origin}/r/${form.code || "CODE"}`}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="invite-label" className="gap-1.5">
                                ชื่อช่องทาง
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden="true" />
                            </Label>
                            <Input
                                id="invite-label"
                                value={form.label}
                                disabled={!canEdit}
                                onChange={(event) => setForm({ ...form, label: event.target.value })}
                                placeholder="เช่น TikTok — น้องเอ"
                            />
                            <p className="text-xs text-muted-foreground">ชื่อที่ใช้จำว่าลิงก์นี้ส่งให้ใคร</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="invite-destination">หน้าปลายทาง</Label>
                            <select
                                id="invite-destination"
                                value={form.destination}
                                disabled={!canEdit}
                                onChange={(event) => setForm({ ...form, destination: event.target.value })}
                                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-base shadow-xs outline-none disabled:opacity-50 md:text-sm"
                            >
                                {DESTINATION_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label} ({option.value})
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-muted-foreground">หน้าที่คนกดลิงก์จะไปโผล่</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                            onClick={saveForm}
                            disabled={!canEdit || isSaving}
                            className="h-11 flex-1 gap-2 bg-[#145de7] text-white hover:bg-[#1150c9]"
                        >
                            <Save className="h-4 w-4" />
                            {isSaving ? "กำลังบันทึก..." : "บันทึก"}
                        </Button>
                        {editingId ? (
                            <Button
                                variant="outline"
                                onClick={resetForm}
                                className="h-11 gap-2 sm:w-40"
                            >
                                <X className="h-4 w-4" />
                                ยกเลิกการแก้ไข
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* รายการ */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#145de7]/10 text-[#145de7] ring-1 ring-[#145de7]/30 dark:bg-[#145de7]/20">
                        <Link2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-[#145de7] dark:text-[#6ea2ff]">
                            รหัสคำเชิญ
                        </h2>
                        <p className="text-sm text-muted-foreground">รายการรหัสที่สร้างไว้</p>
                    </div>
                    <p className="ml-auto hidden text-sm text-muted-foreground sm:block">
                        รวม สมัคร {totals.signups.toLocaleString()} · ฿
                        {totals.topupTotal.toLocaleString()}
                    </p>
                </div>

                {/* แถบเครื่องมือ */}
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                        <input
                            type="text"
                            placeholder="ค้นหา..."
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            className="h-9 w-full rounded-xl border border-border bg-muted pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-blue-500 focus:bg-card focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-500/20 sm:w-60"
                        />
                    </div>

                    <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1">
                        {STATUS_OPTIONS.map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => {
                                    setStatusFilter(option.key);
                                    setPage(1);
                                }}
                                className={cn(
                                    "h-7 rounded-lg px-3 text-sm transition",
                                    statusFilter === option.key
                                        ? "bg-card font-semibold text-[#145de7] shadow-xs dark:text-[#6ea2ff]"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label="เรียงลำดับ"
                                className="h-9 w-9"
                            >
                                <ArrowDownWideNarrow className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44">
                            {SORT_OPTIONS.map((option) => (
                                <DropdownMenuItem
                                    key={option.key}
                                    onClick={() => setSortKey(option.key)}
                                    className={cn(
                                        "flex items-center gap-2",
                                        sortKey === option.key && "font-semibold text-[#145de7]",
                                    )}
                                >
                                    {option.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DateRangePicker value={range} onChange={setRange} placeholder="ทุกช่วงเวลา" />

                    <div className="ml-auto flex items-center gap-2">
                        {canEdit ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label="ลบลิงก์ที่เลือก"
                                disabled={selected.size === 0}
                                onClick={deleteSelected}
                                className="h-9 w-9 border-rose-500/60 text-rose-600 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-500/10"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        ) : null}
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="รีเฟรชข้อมูล"
                            onClick={refresh}
                            className="h-9 w-9"
                        >
                            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                {selected.size > 0 ? (
                    <div className="border-b border-border bg-muted/50 px-5 py-2 text-sm text-muted-foreground">
                        เลือกไว้ {selected.size} ลิงก์
                    </div>
                ) : null}

                {/* หัวคอลัมน์ */}
                <div className="flex items-center gap-3 border-b border-border px-5 py-2.5 text-xs font-medium text-muted-foreground">
                    {canEdit ? (
                        <Checkbox
                            checked={allOnPageSelected}
                            onCheckedChange={toggleSelectPage}
                            aria-label="เลือกทั้งหน้า"
                            disabled={pageRows.length === 0}
                        />
                    ) : null}
                    <span className="flex-1">รหัสคำเชิญ</span>
                    <span className="w-24 text-center">ผู้สมัคร</span>
                    <span className="w-28 text-center">ยอดเติมเงิน</span>
                    <span className="w-24 text-center">สถานะ</span>
                    <span className="w-9" />
                </div>

                {pageRows.length === 0 ? (
                    <div className="py-14 text-center text-muted-foreground">
                        <Link2 className="mx-auto mb-3 h-12 w-12 opacity-30" />
                        <p className="font-semibold text-foreground">
                            {search
                                ? "ไม่พบรหัสที่ค้นหา"
                                : statusFilter === "stopped"
                                  ? "ยังไม่มีลิงก์ที่ปิดไป"
                                  : "ยังไม่มีรหัสคำเชิญ"}
                        </p>
                        <p className="mt-1 text-sm">
                            {search ? "ลองคำค้นอื่น" : "สร้างรหัสแรกจากฟอร์มด้านบนเพื่อเริ่มวัดผลแต่ละช่องทาง"}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {pageRows.map((row) => (
                            <div
                                key={row.id}
                                className={cn("px-5 py-3", row.deletedAt && "bg-muted/40")}
                            >
                                <div className="flex items-center gap-3">
                                    {canEdit ? (
                                        row.deletedAt ? (
                                            // Keeps the columns lined up with the live rows above.
                                            <span className="w-4 shrink-0" />
                                        ) : (
                                            <Checkbox
                                                checked={selected.has(row.id)}
                                                onCheckedChange={() => toggleSelected(row.id)}
                                                aria-label={`เลือก ${row.code}`}
                                            />
                                        )
                                    ) : null}

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    "truncate font-mono font-semibold",
                                                    row.deletedAt
                                                        ? "text-muted-foreground line-through"
                                                        : "text-[#145de7] dark:text-[#6ea2ff]",
                                                )}
                                            >
                                                {row.code}
                                            </span>
                                            {row.deletedAt ? null : (
                                                <button
                                                    type="button"
                                                    onClick={() => copyLink(row.code)}
                                                    aria-label={`คัดลอกลิงก์ของ ${row.code}`}
                                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground transition hover:text-foreground"
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="truncate text-sm text-muted-foreground">
                                            {row.label}
                                        </p>
                                    </div>

                                    <span className="w-24 text-center font-semibold tabular-nums text-foreground">
                                        {row.signups.toLocaleString()}
                                    </span>
                                    <span className="w-28 text-center font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                        ฿{row.topupTotal.toLocaleString()}
                                    </span>
                                    <span className="flex w-24 justify-center">
                                        <span
                                            className={cn(
                                                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                                                row.deletedAt
                                                    ? "bg-muted text-muted-foreground"
                                                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                                            )}
                                        >
                                            {row.deletedAt ? "ปิดแล้ว" : "ใช้งาน"}
                                        </span>
                                    </span>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-label={`เมนูจัดการลิงก์ ${row.code}`}
                                                className="h-9 w-9 shrink-0 rounded-full border border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            {canEdit && !row.deletedAt ? (
                                                <DropdownMenuItem
                                                    onClick={() => startEdit(row)}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                    แก้ไข
                                                </DropdownMenuItem>
                                            ) : null}
                                            {row.deletedAt ? null : (
                                                <DropdownMenuItem
                                                    onClick={() => copyLink(row.code)}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                    คัดลอกลิงก์
                                                </DropdownMenuItem>
                                            )}
                                            {canEdit ? (
                                                <DropdownMenuItem
                                                    onClick={() => duplicateRow(row)}
                                                    className="flex items-center gap-2"
                                                >
                                                    <CopyPlus className="h-4 w-4" />
                                                    ทำซ้ำ
                                                </DropdownMenuItem>
                                            ) : null}
                                            {canEdit && !row.deletedAt ? <DropdownMenuSeparator /> : null}
                                            {canEdit && !row.deletedAt ? (
                                                <DropdownMenuItem
                                                    onClick={() => deleteRow(row)}
                                                    className="flex items-center gap-2 text-rose-600 focus:text-rose-600 dark:text-rose-400 dark:focus:text-rose-400"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    ลบ
                                                </DropdownMenuItem>
                                            ) : null}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                    <span className="rounded-full bg-muted px-2 py-0.5">/r/{row.code}</span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatCreatedAt(row.createdAt)}
                                    </span>
                                    <span>ปลายทาง {row.destination}</span>
                                    {row.note ? <span className="truncate">{row.note}</span> : null}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex flex-col items-center gap-3 border-t border-border px-5 py-4">
                    <p className="text-sm text-muted-foreground">
                        แสดง {firstShown} ถึง {lastShown} จาก {visibleRows.length} รายการ
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setPage((value) => Math.max(1, value - 1))}
                        >
                            ย้อนกลับ
                        </Button>
                        <span className="flex h-9 min-w-9 items-center justify-center rounded-full border border-[#145de7] px-3 text-sm font-semibold text-[#145de7] dark:text-[#6ea2ff]">
                            {currentPage}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                        >
                            ถัดไป
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
