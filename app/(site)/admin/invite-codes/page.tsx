"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
    AlertCircle,
    Copy,
    Link2,
    MousePointerClick,
    Pencil,
    Plus,
    UserPlus,
    Wallet,
} from "lucide-react";
import { SpinnerScreen } from "@/components/SpinnerScreen";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { PERMISSIONS } from "@/lib/permissions";
import { API_ROUTES } from "@/lib/constants/apiRoutes";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { showError, showSuccess } from "@/lib/swal";
import { cn } from "@/lib/utils";

interface InviteCodeRow {
    id: string;
    code: string;
    label: string;
    note: string | null;
    destination: string;
    isActive: boolean;
    createdAt: string;
    clicks: number;
    signups: number;
    topupTotal: number;
}

type SortKey = "clicks" | "signups" | "topupTotal";

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
    isActive: true,
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

export default function AdminInviteCodesPage() {
    const permissions = useAdminPermissions();
    const canEdit = permissions.includes(PERMISSIONS.INVITE_EDIT);

    const [rows, setRows] = useState<InviteCodeRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [range, setRange] = useState<DateRange | undefined>();
    const [sortKey, setSortKey] = useState<SortKey>("signups");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [isSaving, setIsSaving] = useState(false);
    const [origin, setOrigin] = useState("");

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const fetchRows = useCallback(async (selected: DateRange | undefined) => {
        try {
            const query = new URLSearchParams();
            if (selected?.from) query.set("startDate", format(selected.from, "yyyy-MM-dd"));
            if (selected?.to) query.set("endDate", format(selected.to, "yyyy-MM-dd"));

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

    const sortedRows = useMemo(
        () => [...rows].sort((a, b) => b[sortKey] - a[sortKey] || b.signups - a.signups),
        [rows, sortKey],
    );

    const totals = useMemo(
        () =>
            rows.reduce(
                (acc, row) => ({
                    clicks: acc.clicks + row.clicks,
                    signups: acc.signups + row.signups,
                    topupTotal: acc.topupTotal + row.topupTotal,
                    active: acc.active + (row.isActive ? 1 : 0),
                }),
                { clicks: 0, signups: 0, topupTotal: 0, active: 0 },
            ),
        [rows],
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

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...EMPTY_FORM, code: randomCode() });
        setIsDialogOpen(true);
    };

    const openEdit = (row: InviteCodeRow) => {
        setEditingId(row.id);
        setForm({
            code: row.code,
            label: row.label,
            note: row.note ?? "",
            destination: row.destination,
            isActive: row.isActive,
        });
        setIsDialogOpen(true);
    };

    const saveForm = async () => {
        setIsSaving(true);
        try {
            const isEditing = editingId !== null;
            const payload = isEditing
                ? {
                      label: form.label,
                      note: form.note.trim() ? form.note : null,
                      destination: form.destination,
                      isActive: form.isActive,
                  }
                : {
                      code: form.code,
                      label: form.label,
                      note: form.note.trim() ? form.note : null,
                      destination: form.destination,
                      isActive: form.isActive,
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
            setIsDialogOpen(false);
            await fetchRows(range);
        } catch (error) {
            console.error("[INVITE_CODE_SAVE]", error);
            showError("บันทึกไม่สำเร็จ");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleActive = async (row: InviteCodeRow, nextActive: boolean) => {
        // Optimistic: the switch is the one control that gets used repeatedly,
        // and waiting a round trip for it feels broken.
        setRows((current) =>
            current.map((item) => (item.id === row.id ? { ...item, isActive: nextActive } : item)),
        );

        try {
            const response = await fetchWithCsrf(API_ROUTES.adminInviteCode(row.id), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: nextActive }),
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.message);
        } catch (error) {
            console.error("[INVITE_CODE_TOGGLE]", error);
            setRows((current) =>
                current.map((item) =>
                    item.id === row.id ? { ...item, isActive: row.isActive } : item,
                ),
            );
            showError("เปลี่ยนสถานะไม่สำเร็จ");
        }
    };

    if (isLoading) {
        return <SpinnerScreen label="กำลังโหลดลิงก์คำเชิญ..." />;
    }

    return (
        <div className="admin-invite-codes-page space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                        <Link2 className="h-6 w-6 text-[#145de7]" />
                        ลิงก์คำเชิญ
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        สร้างลิงก์ให้คนโปรโมท แล้วดูว่าช่องทางไหนพาคนสมัครและเติมเงินเข้ามา
                    </p>
                </div>
                {canEdit ? (
                    <Button onClick={openCreate} className="gap-2">
                        <Plus className="h-4 w-4" />
                        สร้างลิงก์ใหม่
                    </Button>
                ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <DateRangePicker value={range} onChange={setRange} placeholder="ทุกช่วงเวลา" />
                <p className="text-xs text-muted-foreground">
                    ช่วงวันที่มีผลกับ &quot;คลิก&quot; และ &quot;สมัครสมาชิก&quot; เท่านั้น —
                    ยอดเติมเงินนับตลอดอายุบัญชีของคนที่สมัครผ่านลิงก์
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] p-5 shadow-sm dark:border-[#2d4362] dark:bg-[linear-gradient(135deg,rgba(15,25,39,0.98)_0%,rgba(20,32,49,0.94)_100%)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                            <MousePointerClick className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-[#9ab0cb]">คลิกทั้งหมด</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-[#eef4ff]">
                                {totals.clicks.toLocaleString()} คน
                            </p>
                            <p className="text-xs text-slate-400 dark:text-[#8399b8]">นับคนไม่ซ้ำต่อวัน</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_100%)] p-5 shadow-sm dark:border-[#2d4362] dark:bg-[linear-gradient(135deg,rgba(15,25,39,0.98)_0%,rgba(20,32,49,0.94)_100%)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-[#9ab0cb]">สมัครสมาชิก</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-[#eef4ff]">
                                {totals.signups.toLocaleString()} คน
                            </p>
                            <p className="text-xs text-slate-400 dark:text-[#8399b8]">
                                คลิก {totals.clicks.toLocaleString()} → สมัคร {totals.signups.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_100%)] p-5 shadow-sm dark:border-[#2d4362] dark:bg-[linear-gradient(135deg,rgba(15,25,39,0.98)_0%,rgba(20,32,49,0.94)_100%)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-[#9ab0cb]">ยอดเติมเงินรวม</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-[#eef4ff]">
                                ฿{totals.topupTotal.toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-[#8399b8]">ตลอดอายุบัญชี</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_100%)] p-5 shadow-sm dark:border-[#2d4362] dark:bg-[linear-gradient(135deg,rgba(15,25,39,0.98)_0%,rgba(20,32,49,0.94)_100%)]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-600 text-white shadow-sm">
                            <Link2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-[#9ab0cb]">ลิงก์ที่เปิดใช้งาน</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-[#eef4ff]">
                                {totals.active} จาก {rows.length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm dark:bg-zinc-900">
                <div className="flex flex-col gap-3 border-b border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-[#145de7]">
                            <Link2 className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="font-bold text-foreground">ลิงก์ทั้งหมด ({rows.length})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground">เรียงตาม</span>
                        {(
                            [
                                { key: "signups", label: "สมัคร" },
                                { key: "topupTotal", label: "ยอดเติม" },
                                { key: "clicks", label: "คลิก" },
                            ] as { key: SortKey; label: string }[]
                        ).map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => setSortKey(option.key)}
                                className={cn(
                                    "rounded-full border px-3 py-1.5 font-medium transition",
                                    sortKey === option.key
                                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                        : "border-border bg-muted text-muted-foreground hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-300",
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {rows.length === 0 ? (
                    <div className="py-14 text-center text-muted-foreground">
                        <AlertCircle className="mx-auto mb-3 h-12 w-12 opacity-30" />
                        <p className="font-semibold text-foreground">ยังไม่มีลิงก์คำเชิญ</p>
                        <p className="mt-1 text-sm">สร้างลิงก์แรกเพื่อเริ่มวัดผลแต่ละช่องทาง</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ช่องทาง</TableHead>
                                    <TableHead>โค้ด / ลิงก์</TableHead>
                                    <TableHead className="text-right">คลิก</TableHead>
                                    <TableHead className="text-right">สมัครสมาชิก</TableHead>
                                    <TableHead className="text-right">ยอดเติมเงิน</TableHead>
                                    <TableHead>ปลายทาง</TableHead>
                                    <TableHead className="text-center">สถานะ</TableHead>
                                    <TableHead className="text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedRows.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            <p className="font-semibold text-foreground">{row.label}</p>
                                            {row.note ? (
                                                <p className="text-xs text-muted-foreground">{row.note}</p>
                                            ) : null}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm text-foreground">{row.code}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => copyLink(row.code)}
                                                    aria-label={`คัดลอกลิงก์ของ ${row.code}`}
                                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition hover:text-foreground"
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">/r/{row.code}</p>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {row.clicks.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold tabular-nums text-foreground">
                                            {row.signups.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                            ฿{row.topupTotal.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {row.destination}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Switch
                                                checked={row.isActive}
                                                disabled={!canEdit}
                                                onCheckedChange={(next) => toggleActive(row, next)}
                                                aria-label={`เปิดใช้งานลิงก์ ${row.code}`}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={!canEdit}
                                                onClick={() => openEdit(row)}
                                                className="gap-1"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                แก้ไข
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                            คนหนึ่งคนถูกนับให้ลิงก์ล่าสุดที่กดก่อนสมัคร และยอดเติมเงินของเขาจะนับให้ลิงก์นั้นตลอดไป
                        </p>
                    </div>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? "แก้ไขลิงก์คำเชิญ" : "สร้างลิงก์คำเชิญ"}</DialogTitle>
                        <DialogDescription>
                            ตั้งชื่อช่องทางให้จำได้ว่าลิงก์นี้ส่งให้ใคร แล้วส่งลิงก์ให้เขาไปแปะ
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="invite-label">ชื่อช่องทาง</Label>
                            <Input
                                id="invite-label"
                                value={form.label}
                                onChange={(event) => setForm({ ...form, label: event.target.value })}
                                placeholder="เช่น TikTok — น้องเอ"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="invite-code">โค้ด</Label>
                            <Input
                                id="invite-code"
                                value={form.code}
                                disabled={editingId !== null}
                                onChange={(event) =>
                                    setForm({ ...form, code: event.target.value.toUpperCase() })
                                }
                                className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                                {editingId
                                    ? "โค้ดแก้ไม่ได้ เพราะลิงก์ถูกแจกออกไปแล้วและมีผู้สมัครผูกอยู่"
                                    : `ลิงก์ที่ได้: ${origin}/r/${form.code || "CODE"}`}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="invite-destination">หน้าปลายทาง</Label>
                            <select
                                id="invite-destination"
                                value={form.destination}
                                onChange={(event) =>
                                    setForm({ ...form, destination: event.target.value })
                                }
                                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-base shadow-xs outline-none md:text-sm"
                            >
                                {DESTINATION_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label} ({option.value})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="invite-note">หมายเหตุ (เห็นเฉพาะแอดมิน)</Label>
                            <Textarea
                                id="invite-note"
                                value={form.note}
                                onChange={(event) => setForm({ ...form, note: event.target.value })}
                                placeholder="เช่น ค่าจ้าง 2,000 บาท/เดือน ติดต่อทางไลน์"
                                rows={2}
                            />
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                            <div>
                                <Label htmlFor="invite-active">เปิดใช้งาน</Label>
                                <p className="text-xs text-muted-foreground">
                                    ปิดแล้วลิงก์ยังเข้าเว็บได้ แต่จะไม่นับคลิกและไม่ผูกคนสมัครให้อีก
                                </p>
                            </div>
                            <Switch
                                id="invite-active"
                                checked={form.isActive}
                                onCheckedChange={(next) => setForm({ ...form, isActive: next })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            ยกเลิก
                        </Button>
                        <Button onClick={saveForm} disabled={isSaving || !form.label.trim()}>
                            {isSaving ? "กำลังบันทึก..." : "บันทึก"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
