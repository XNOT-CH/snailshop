"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { SpinnerScreen } from "@/components/SpinnerScreen";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { PERMISSIONS } from "@/lib/permissions";
import { showSuccess, showError, showDeleteConfirm, showConfirm } from "@/lib/swal";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import {
    ArrowDownAZ,
    ArrowDownUp,
    ArrowUpDown,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Download,
    GripVertical,
    Inbox,
    LayoutGrid,
    Lightbulb,
    List,
    Loader2,
    Pencil,
    RefreshCw,
    Save,
    ScrollText,
    Search,
    ShieldCheck,
    Trash2,
    X,
} from "lucide-react";
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import type { RegistrationPolicyType } from "@/lib/validations/content";

const API_BASE = "/api/admin/registration-policies";
const ITEMS_PER_PAGE = 10;

interface RegistrationPolicy {
    id: string;
    type: RegistrationPolicyType;
    titleTh: string;
    titleEn: string | null;
    contentTh: string;
    contentEn: string | null;
    sortOrder: number;
    isActive: boolean;
}

// The two screens are identical apart from this copy, so the page components
// only pass `type` and everything else is derived here.
const POLICY_COPY = {
    TOS: {
        name: "เงื่อนไขการใช้งาน (TOS)",
        icon: ScrollText,
        formSubtitle: "เพิ่มหัวข้อและเนื้อหาเงื่อนไขการใช้งาน (ภาษาไทย / อังกฤษ)",
        fileName: "terms-of-service",
    },
    PP: {
        name: "นโยบายความเป็นส่วนตัว (PP)",
        icon: ShieldCheck,
        formSubtitle: "เพิ่มหัวข้อและเนื้อหานโยบายความเป็นส่วนตัว (ภาษาไทย / อังกฤษ)",
        fileName: "privacy-policy",
    },
} as const;

const LIST_SUBTITLE = "ค้นหา แก้ไข ลบ หรือจัดลำดับข้อความที่แสดงตอนสมัครสมาชิก";

const HOW_TO_LINES = [
    "กรอกชื่อหัวข้อและเนื้อหาแล้วกดบันทึก ข้อความจะไปแสดงในหน้าสมัครสมาชิกทันที",
    "ช่องภาษาอังกฤษไม่บังคับ ถ้าเว้นว่างไว้ ระบบจะใช้ข้อความภาษาไทยแทน",
    "ลากที่จับด้านซ้ายของแถวเพื่อสลับลำดับ ลำดับบนสุดคือข้อที่ผู้ใช้เห็นก่อน",
    "ปิดสวิตช์เพื่อซ่อนข้อนั้นชั่วคราวโดยไม่ต้องลบทิ้ง",
];

type SortMode = "manual" | "title";
type SortDirection = "asc" | "desc";
type ViewMode = "table" | "card";

function emptyForm() {
    return { titleTh: "", titleEn: "", contentTh: "", contentEn: "" };
}

function excerpt(text: string, max = 70) {
    const flat = text.replaceAll(/\s+/g, " ").trim();
    return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

// Wraps a value for CSV: double the quotes, then quote the whole field.
function csvCell(value: string | number | boolean) {
    return `"${String(value).replaceAll('"', '""')}"`;
}

function usePolicySortable(id: string, disabled: boolean) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
        disabled,
    });
    const style: React.CSSProperties = {
        transition: isDragging ? undefined : transition,
        opacity: isDragging ? 0 : 1,
        transform: CSS.Transform.toString(transform),
    };
    return { setNodeRef, style, handleProps: { ...attributes, ...listeners } };
}

function DragHandle({
    handleProps,
    disabled,
}: Readonly<{ handleProps: Record<string, unknown>; disabled: boolean }>) {
    return (
        <span
            {...(disabled ? {} : handleProps)}
            aria-hidden={disabled}
            className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground select-none",
                disabled ? "opacity-30" : "cursor-grab touch-none active:cursor-grabbing hover:bg-muted",
            )}
        >
            <GripVertical className="h-4 w-4" />
        </span>
    );
}

interface RowProps {
    item: RegistrationPolicy;
    position: number;
    canEdit: boolean;
    dragDisabled: boolean;
    onEdit: (item: RegistrationPolicy) => void;
    onDelete: (item: RegistrationPolicy) => void;
    onToggleActive: (item: RegistrationPolicy) => void;
}

function PolicyTableRow({
    item,
    position,
    canEdit,
    dragDisabled,
    onEdit,
    onDelete,
    onToggleActive,
}: Readonly<RowProps>) {
    const { setNodeRef, style, handleProps } = usePolicySortable(item.id, dragDisabled || !canEdit);

    return (
        <TableRow ref={setNodeRef} style={style}>
            <TableCell className="w-20">
                <div className="flex items-center gap-1">
                    <DragHandle handleProps={handleProps} disabled={dragDisabled || !canEdit} />
                    <span className="text-xs tabular-nums text-muted-foreground">{position}</span>
                </div>
            </TableCell>
            <TableCell className="min-w-[200px]">
                <p className="text-sm font-medium text-foreground">{item.titleTh}</p>
                {item.titleEn ? (
                    <p className="text-xs text-muted-foreground">{item.titleEn}</p>
                ) : (
                    <p className="text-xs text-muted-foreground/70">ไม่ได้กรอกภาษาอังกฤษ</p>
                )}
            </TableCell>
            <TableCell className="min-w-[240px] text-xs text-muted-foreground">
                {excerpt(item.contentTh)}
            </TableCell>
            <TableCell className="w-28">
                <div className="flex items-center gap-2">
                    <Switch
                        checked={item.isActive}
                        onCheckedChange={() => onToggleActive(item)}
                        disabled={!canEdit}
                        aria-label={item.isActive ? "ซ่อนข้อนี้" : "แสดงข้อนี้"}
                    />
                    <span className="text-xs text-muted-foreground">
                        {item.isActive ? "แสดง" : "ซ่อน"}
                    </span>
                </div>
            </TableCell>
            <TableCell className="w-24 text-right">
                <div className="flex justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(item)}
                        disabled={!canEdit}
                        aria-label="แก้ไข"
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(item)}
                        disabled={!canEdit}
                        aria-label="ลบ"
                        className="text-destructive"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}

function PolicyCard({
    item,
    position,
    canEdit,
    dragDisabled,
    onEdit,
    onDelete,
    onToggleActive,
}: Readonly<RowProps>) {
    const { setNodeRef, style, handleProps } = usePolicySortable(item.id, dragDisabled || !canEdit);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
            <div className="flex items-start gap-2">
                <DragHandle handleProps={handleProps} disabled={dragDisabled || !canEdit} />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                        <span className="mr-2 text-xs tabular-nums text-muted-foreground">{position}.</span>
                        {item.titleTh}
                    </p>
                    {item.titleEn ? (
                        <p className="text-xs text-muted-foreground">{item.titleEn}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">{excerpt(item.contentTh, 120)}</p>
                </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-2">
                    <Switch
                        checked={item.isActive}
                        onCheckedChange={() => onToggleActive(item)}
                        disabled={!canEdit}
                        aria-label={item.isActive ? "ซ่อนข้อนี้" : "แสดงข้อนี้"}
                    />
                    <span className="text-xs text-muted-foreground">
                        {item.isActive ? "แสดง" : "ซ่อน"}
                    </span>
                </div>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => onEdit(item)} disabled={!canEdit} aria-label="แก้ไข">
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(item)}
                        disabled={!canEdit}
                        aria-label="ลบ"
                        className="text-destructive"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function RegistrationPolicyManager({ type }: Readonly<{ type: RegistrationPolicyType }>) {
    const copy = POLICY_COPY[type];
    const Icon = copy.icon;

    const permissions = useAdminPermissions();
    const canEdit = permissions.includes(PERMISSIONS.CONTENT_EDIT);

    const [items, setItems] = useState<RegistrationPolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [reordering, setReordering] = useState(false);

    const [showHowTo, setShowHowTo] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [sortMode, setSortMode] = useState<SortMode>("manual");
    const [sortDir, setSortDir] = useState<SortDirection>("asc");
    const [viewMode, setViewMode] = useState<ViewMode>("table");
    const [currentPage, setCurrentPage] = useState(1);

    const [activeItem, setActiveItem] = useState<RegistrationPolicy | null>(null);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}?type=${type}`);
            if (!res.ok) throw new Error("fetch failed");
            setItems(await res.json());
        } catch (error) {
            console.error("Error fetching registration policies:", error);
            showError("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setLoading(false);
        }
    }, [type]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    useEffect(() => {
        const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, sortMode, sortDir]);

    const visibleItems = useMemo(() => {
        const needle = search.toLowerCase();
        const filtered = needle
            ? items.filter((item) =>
                  [item.titleTh, item.titleEn, item.contentTh, item.contentEn]
                      .filter(Boolean)
                      .some((field) => field!.toLowerCase().includes(needle)),
              )
            : [...items];

        filtered.sort((a, b) =>
            sortMode === "title"
                ? a.titleTh.localeCompare(b.titleTh, "th")
                : a.sortOrder - b.sortOrder,
        );

        return sortDir === "desc" ? filtered.reverse() : filtered;
    }, [items, search, sortMode, sortDir]);

    // Dragging is only honest when what you see is the stored order. While a
    // search filters rows out, or the list is sorted by title, the dropped
    // position would not be the position that gets saved — so lock it instead.
    const dragLockReason = useMemo(() => {
        if (!canEdit) return "คุณไม่มีสิทธิ์แก้ไข";
        if (search) return "ล้างช่องค้นหาก่อนจึงจะจัดลำดับได้";
        if (sortMode !== "manual" || sortDir !== "asc") return "สลับกลับเป็น “ลำดับที่ตั้งเอง” ก่อนจึงจะจัดลำดับได้";
        return null;
    }, [canEdit, search, sortMode, sortDir]);
    const dragDisabled = dragLockReason !== null;

    const totalPages = Math.max(1, Math.ceil(visibleItems.length / ITEMS_PER_PAGE));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = visibleItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const resetForm = () => {
        setForm(emptyForm());
        setEditingId(null);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!canEdit) {
            showError("คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้");
            return;
        }
        if (!form.titleTh.trim() || !form.contentTh.trim()) {
            showError("กรุณากรอกชื่อหัวข้อและเนื้อหาภาษาไทย");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                titleTh: form.titleTh.trim(),
                titleEn: form.titleEn.trim(),
                contentTh: form.contentTh.trim(),
                contentEn: form.contentEn.trim(),
            };
            const res = await fetchWithCsrf(
                editingId ? `${API_BASE}/${editingId}` : API_BASE,
                {
                    method: editingId ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(editingId ? payload : { ...payload, type }),
                },
            );

            if (!res.ok) {
                const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
                showError(data.message || data.error || "บันทึกไม่สำเร็จ");
                return;
            }

            showSuccess(editingId ? "แก้ไขเรียบร้อย" : "เพิ่มเรียบร้อย");
            resetForm();
            await fetchData();
        } catch (error) {
            console.error("Error saving registration policy:", error);
            showError("บันทึกไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (item: RegistrationPolicy) => {
        setEditingId(item.id);
        setForm({
            titleTh: item.titleTh,
            titleEn: item.titleEn ?? "",
            contentTh: item.contentTh,
            contentEn: item.contentEn ?? "",
        });
        globalThis.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (item: RegistrationPolicy) => {
        if (!canEdit) {
            showError("คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้");
            return;
        }
        if (!(await showDeleteConfirm(item.titleTh))) return;

        try {
            const res = await fetchWithCsrf(`${API_BASE}/${item.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("delete failed");
            if (editingId === item.id) resetForm();
            showSuccess("ลบเรียบร้อย");
            await fetchData();
        } catch (error) {
            console.error("Error deleting registration policy:", error);
            showError("ลบไม่สำเร็จ");
        }
    };

    const handleDeleteAll = async () => {
        if (!canEdit) {
            showError("คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้");
            return;
        }
        if (items.length === 0) {
            showError("ยังไม่มีรายการให้ลบ");
            return;
        }
        const confirmed = await showConfirm(
            "ลบทั้งหมด?",
            `${copy.name} ทั้ง ${items.length} รายการจะถูกลบถาวร กู้คืนไม่ได้`,
            "ลบทั้งหมด",
        );
        if (!confirmed) return;

        try {
            const res = await fetchWithCsrf(`${API_BASE}?type=${type}`, { method: "DELETE" });
            if (!res.ok) throw new Error("delete all failed");
            resetForm();
            showSuccess("ลบทั้งหมดเรียบร้อย");
            await fetchData();
        } catch (error) {
            console.error("Error deleting all registration policies:", error);
            showError("ลบไม่สำเร็จ");
        }
    };

    const handleToggleActive = async (item: RegistrationPolicy) => {
        if (!canEdit) {
            showError("คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้");
            return;
        }
        const nextActive = !item.isActive;
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isActive: nextActive } : i)));

        try {
            const res = await fetchWithCsrf(`${API_BASE}/${item.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: nextActive }),
            });
            if (!res.ok) throw new Error("toggle failed");
        } catch (error) {
            console.error("Error toggling registration policy:", error);
            showError("เปลี่ยนสถานะไม่สำเร็จ");
            void fetchData();
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveItem(items.find((i) => i.id === event.active.id) ?? null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveItem(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = visibleItems.findIndex((i) => i.id === active.id);
        const newIndex = visibleItems.findIndex((i) => i.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(visibleItems, oldIndex, newIndex);
        const sortOrderById = new Map(reordered.map((i, index) => [i.id, index]));

        // Optimistic update — the server call below rolls it back on failure.
        setItems((prev) =>
            prev.map((i) => ({ ...i, sortOrder: sortOrderById.get(i.id) ?? i.sortOrder })),
        );

        setReordering(true);
        try {
            const res = await fetchWithCsrf(`${API_BASE}/reorder`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orders: reordered.map((i, index) => ({ id: i.id, sortOrder: index })),
                }),
            });
            if (!res.ok) throw new Error("reorder failed");
        } catch (error) {
            console.error("Error reordering registration policies:", error);
            showError("จัดลำดับไม่สำเร็จ");
            void fetchData();
        } finally {
            setReordering(false);
        }
    };

    const handleExportCsv = () => {
        if (visibleItems.length === 0) {
            showError("ยังไม่มีรายการให้ส่งออก");
            return;
        }
        const header = ["ลำดับ", "ชื่อหัวข้อ (ไทย)", "ชื่อหัวข้อ (อังกฤษ)", "เนื้อหา (ไทย)", "เนื้อหา (อังกฤษ)", "สถานะ"];
        const rows = visibleItems.map((item, index) =>
            [
                index + 1,
                item.titleTh,
                item.titleEn ?? "",
                item.contentTh,
                item.contentEn ?? "",
                item.isActive ? "แสดง" : "ซ่อน",
            ]
                .map(csvCell)
                .join(","),
        );
        // The BOM is what makes Excel read the Thai text as UTF-8.
        const csv = `﻿${[header.map(csvCell).join(","), ...rows].join("\r\n")}`;
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${copy.fileName}-${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return <SpinnerScreen label="กำลังโหลดข้อมูล..." />;

    const toolbarButton = "h-9 w-9 rounded-xl border-border";
    const showingFrom = visibleItems.length === 0 ? 0 : startIndex + 1;
    const showingTo = Math.min(startIndex + ITEMS_PER_PAGE, visibleItems.length);

    return (
        <div className="space-y-6">
            {/* วิธีใช้งาน */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <button
                    type="button"
                    onClick={() => setShowHowTo((prev) => !prev)}
                    aria-expanded={showHowTo}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-primary"
                >
                    <Lightbulb className="h-4 w-4" />
                    วิธีใช้งาน : คลิกที่นี่
                    <ChevronDown
                        className={cn("h-4 w-4 transition-transform", showHowTo && "rotate-180")}
                    />
                </button>
                {showHowTo ? (
                    <ul className="space-y-2 border-t border-border px-5 py-4 text-xs text-muted-foreground">
                        {HOW_TO_LINES.map((line) => (
                            <li key={line} className="flex gap-2">
                                <span className="text-primary">•</span>
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>

            {/* ฟอร์มเพิ่ม / แก้ไข */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex items-start gap-3 border-b border-border px-5 py-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-[#eef4ff] text-primary">
                        <Icon className="h-5 w-5" />
                    </span>
                    <div>
                        <h1 className="text-xl font-bold text-primary">{copy.name}</h1>
                        <p className="text-sm text-muted-foreground">{copy.formSubtitle}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
                    <div className="space-y-2">
                        <Label htmlFor="policy-title-th">ชื่อหัวข้อ (ไทย)</Label>
                        <Input
                            id="policy-title-th"
                            value={form.titleTh}
                            onChange={(e) => setForm((prev) => ({ ...prev, titleTh: e.target.value }))}
                            maxLength={255}
                            disabled={!canEdit}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="policy-title-en">ชื่อหัวข้อ (อังกฤษ)</Label>
                        <Input
                            id="policy-title-en"
                            value={form.titleEn}
                            onChange={(e) => setForm((prev) => ({ ...prev, titleEn: e.target.value }))}
                            maxLength={255}
                            disabled={!canEdit}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="policy-content-th">เนื้อหา (ไทย)</Label>
                        <Textarea
                            id="policy-content-th"
                            value={form.contentTh}
                            onChange={(e) => setForm((prev) => ({ ...prev, contentTh: e.target.value }))}
                            maxLength={20000}
                            rows={6}
                            className="min-h-32"
                            disabled={!canEdit}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="policy-content-en">เนื้อหา (อังกฤษ)</Label>
                        <Textarea
                            id="policy-content-en"
                            value={form.contentEn}
                            onChange={(e) => setForm((prev) => ({ ...prev, contentEn: e.target.value }))}
                            maxLength={20000}
                            rows={6}
                            className="min-h-32"
                            disabled={!canEdit}
                        />
                        <p className="text-xs text-muted-foreground">
                            เว้นว่างได้ — หน้าเว็บจะใช้ข้อความภาษาไทยแทน
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button type="submit" className="w-full gap-2 rounded-xl" disabled={!canEdit || saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {editingId ? "บันทึกการแก้ไข" : "บันทึก"}
                        </Button>
                        {editingId ? (
                            <Button
                                type="button"
                                variant="outline"
                                className="gap-2 rounded-xl sm:w-40"
                                onClick={resetForm}
                                disabled={saving}
                            >
                                <X className="h-4 w-4" />
                                ยกเลิก
                            </Button>
                        ) : null}
                    </div>
                </form>
            </div>

            {/* รายการ */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex items-start gap-3 border-b border-border px-5 py-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-[#eef4ff] text-primary">
                        <Icon className="h-5 w-5" />
                    </span>
                    <div>
                        <h2 className="text-xl font-bold text-primary">{copy.name}</h2>
                        <p className="text-sm text-muted-foreground">{LIST_SUBTITLE}</p>
                    </div>
                </div>

                {/* แถบเครื่องมือ */}
                <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                        <div className="relative min-w-[180px] flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="ค้นหา.."
                                className="h-9 rounded-xl pl-9"
                                aria-label="ค้นหารายการ"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            className={toolbarButton}
                            onClick={() => setSortMode((prev) => (prev === "manual" ? "title" : "manual"))}
                            title={sortMode === "manual" ? "เรียงตามลำดับที่ตั้งเอง" : "เรียงตามชื่อหัวข้อ"}
                            aria-label="สลับเกณฑ์การเรียง"
                        >
                            {sortMode === "manual" ? <ArrowDownUp className="h-4 w-4" /> : <ArrowDownAZ className="h-4 w-4" />}
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className={toolbarButton}
                            onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
                            title={sortDir === "asc" ? "เรียงจากน้อยไปมาก" : "เรียงจากมากไปน้อย"}
                            aria-label="สลับทิศทางการเรียง"
                        >
                            <ArrowUpDown className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className={toolbarButton}
                            onClick={() => setViewMode((prev) => (prev === "table" ? "card" : "table"))}
                            title={viewMode === "table" ? "สลับเป็นมุมมองการ์ด" : "สลับเป็นมุมมองตาราง"}
                            aria-label="สลับมุมมอง"
                        >
                            {viewMode === "table" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className={cn(toolbarButton, "border-destructive/40 text-destructive hover:bg-destructive/10")}
                            onClick={handleDeleteAll}
                            disabled={!canEdit}
                            title="ลบทั้งหมด"
                            aria-label="ลบทั้งหมด"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className={toolbarButton}
                            onClick={handleExportCsv}
                            title="ส่งออกเป็นไฟล์ CSV"
                            aria-label="ส่งออกเป็นไฟล์ CSV"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className={toolbarButton}
                            onClick={() => void fetchData()}
                            title="รีเฟรช"
                            aria-label="รีเฟรช"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {reordering ? (
                    <p className="flex items-center gap-2 border-b border-border px-5 py-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> กำลังบันทึกลำดับ...
                    </p>
                ) : null}
                {dragLockReason && visibleItems.length > 1 ? (
                    <p className="border-b border-border px-5 py-2 text-xs text-muted-foreground">
                        จัดลำดับด้วยการลากยังใช้ไม่ได้ตอนนี้ — {dragLockReason}
                    </p>
                ) : null}

                {visibleItems.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-5 py-14 text-muted-foreground">
                        <Inbox className="h-10 w-10 opacity-40" />
                        <p className="text-sm">{search ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มีรายการ"}</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                        onDragStart={handleDragStart}
                        onDragCancel={() => setActiveItem(null)}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={pageItems.map((i) => i.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {viewMode === "table" ? (
                                <Table className="min-w-[720px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-20">ลำดับ</TableHead>
                                            <TableHead>ชื่อหัวข้อ</TableHead>
                                            <TableHead>เนื้อหา</TableHead>
                                            <TableHead className="w-28">สถานะ</TableHead>
                                            <TableHead className="w-24 text-right">จัดการ</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pageItems.map((item, index) => (
                                            <PolicyTableRow
                                                key={item.id}
                                                item={item}
                                                position={startIndex + index + 1}
                                                canEdit={canEdit}
                                                dragDisabled={dragDisabled}
                                                onEdit={handleEdit}
                                                onDelete={handleDelete}
                                                onToggleActive={handleToggleActive}
                                            />
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="space-y-3 px-5 py-4">
                                    {pageItems.map((item, index) => (
                                        <PolicyCard
                                            key={item.id}
                                            item={item}
                                            position={startIndex + index + 1}
                                            canEdit={canEdit}
                                            dragDisabled={dragDisabled}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                            onToggleActive={handleToggleActive}
                                        />
                                    ))}
                                </div>
                            )}
                        </SortableContext>
                        <DragOverlay>
                            {activeItem ? (
                                <div className="rounded-xl border border-primary/40 bg-card px-4 py-3 text-sm font-medium text-foreground shadow-lg">
                                    {activeItem.titleTh}
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}

                <div className="flex flex-col gap-3 border-t border-border px-5 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <span>
                        แสดง {showingFrom} ถึง {showingTo} จาก {visibleItems.length} รายการ
                    </span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className={cn(toolbarButton, "disabled:opacity-50")}
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={safeCurrentPage <= 1}
                            aria-label="ย้อนกลับ"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {Array.from({ length: totalPages }, (_, index) => index + 1)
                            .slice(Math.max(0, safeCurrentPage - 2), Math.max(3, safeCurrentPage + 1))
                            .map((page) => (
                                <Button
                                    key={page}
                                    variant="outline"
                                    onClick={() => setCurrentPage(page)}
                                    className={cn(
                                        "h-9 min-w-9 rounded-xl px-3",
                                        page === safeCurrentPage && "bg-primary text-primary-foreground hover:bg-primary/90",
                                    )}
                                >
                                    {page}
                                </Button>
                            ))}
                        <Button
                            variant="outline"
                            size="icon"
                            className={cn(toolbarButton, "disabled:opacity-50")}
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={safeCurrentPage >= totalPages}
                            aria-label="ถัดไป"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
