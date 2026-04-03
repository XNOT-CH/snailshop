"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, LayoutGrid, Upload, X, ImageIcon, Copy, GripVertical } from "lucide-react";
import { showSuccess, showError, showDeleteConfirm } from "@/lib/swal";
import Image from "next/image";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";



interface GachaMachine {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    gameType: string;
    categoryId: string | null;
    costType: string;
    costAmount: number;
    dailySpinLimit: number;
    isActive: boolean;
    isEnabled: boolean;
    sortOrder: number;
    category: { name: string } | null;
    _count: { rewards: number };
}

function validImageUrl(url: string | null): boolean {
    return url !== null && (url.startsWith("/") || url.startsWith("http"));
}

const inputCls =
    "w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#145de7]/30 focus:border-[#145de7] transition";

const labelCls = "block text-[13px] font-semibold text-[#145de7] mb-1.5";

const GAME_TYPES = [
    {
        value: "SPIN_X",
        label: "สุ่มตัว X",
        desc: "มินิเกมสุ่มตัวอักษร X แบบคลาสสิก",
        icon: "🎰",
    },
    {
        value: "GRID_3X3",
        label: "3×3",
        desc: "กริด 3 คูณ 3 สุ่มช่องรางวัล",
        icon: "⊞",
    },
];

export default function GachaMachinesAdminPage() {
    const [machines, setMachines] = useState<GachaMachine[]>([]);
    const [loading, setLoading] = useState(true);

    const [machineForm, setMachineForm] = useState({
        name: "",
        description: "",
        imageUrl: "",
        gameType: "SPIN_X",
        categoryId: "",
        costType: "FREE",
        costAmount: 0,
        dailySpinLimit: 0,
        sortOrder: 0,
    });
    const [savingMachine, setSavingMachine] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadAll = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const machRes = await fetch("/api/admin/gacha-machines");
            const machJson = await machRes.json() as { success: boolean; data: GachaMachine[] };
            if (machJson.success) setMachines(machJson.data);
        } catch { /* ignore */ }
        if (!silent) setLoading(false);
    };

    useEffect(() => { loadAll(); }, []);


    const handleImageUpload = async (file: File) => {
        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/admin/gacha-machines/upload-image", {
                method: "POST",
                body: formData,
            });
            const json = await res.json() as { success: boolean; url?: string; message?: string };
            if (json.success && json.url) {
                setMachineForm(f => ({ ...f, imageUrl: json.url! }));
                showSuccess("อัปโหลดรูปสำเร็จ");
            } else {
                showError(json.message ?? "อัปโหลดไม่สำเร็จ");
            }
        } catch { showError("เกิดข้อผิดพลาดในการอัปโหลด"); }
        finally { setUploadingImage(false); }
    };

    const addMachine = async () => {
        if (!machineForm.name.trim()) return showError("ต้องใส่ชื่อตู้กาชา");
        setSavingMachine(true);
        try {
            const res = await fetch("/api/admin/gacha-machines", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...machineForm,
                    imageUrl: machineForm.imageUrl || null,
                    description: machineForm.description || null,
                    categoryId: machineForm.categoryId || null,
                }),
            });
            const json = await res.json() as { success: boolean };
            if (json.success) {
                showSuccess("เพิ่มตู้กาชาแล้ว");
                setMachineForm({ name: "", description: "", imageUrl: "", gameType: "SPIN_X", categoryId: "", costType: "FREE", costAmount: 0, dailySpinLimit: 0, sortOrder: 0 });
                loadAll();
            } else showError("เพิ่มไม่สำเร็จ");
        } catch { showError("เกิดข้อผิดพลาด"); } finally { setSavingMachine(false); }
    };

    const toggleMachine = async (id: string, field: "isActive" | "isEnabled", val: boolean) => {
        // Optimistic update — no full reload so page doesn't scroll
        setMachines(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));
        try {
            await fetch(`/api/admin/gacha-machines/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: val }),
            });
        } catch {
            // Revert on failure
            setMachines(prev => prev.map(m => m.id === id ? { ...m, [field]: !val } : m));
            showError("บันทึกสถานะไม่สำเร็จ");
        }
    };

    const deleteMachine = async (id: string) => {
        if (!await showDeleteConfirm("ตู้กาชานี้")) return;
        // Optimistic: remove from state immediately
        setMachines(prev => prev.filter(m => m.id !== id));
        try {
            const res = await fetch(`/api/admin/gacha-machines/${id}`, { method: "DELETE" });
            const json = await res.json() as { success: boolean };
            if (!json.success) {
                // Revert if server said no
                loadAll();
                showError("ลบไม่สำเร็จ");
            }
        } catch {
            loadAll();
            showError("เกิดข้อผิดพลาดในการลบ");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">


            {/* ── เพิ่มตู้กาชา ── */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="mb-5">
                    <h2 className="text-base font-bold text-[#145de7]">ตู้กาชา</h2>
                    <p className="text-xs text-muted-foreground">จัดการตู้กาชา</p>
                </div>

                {/* ── ประเภทมินิเกม ── */}
                <div className="mb-5">
                    <span className={labelCls}>ประเภทมินิเกม *</span>
                    <div className="grid grid-cols-2 gap-3">
                        {GAME_TYPES.map(gt => (
                            <button
                                key={gt.value}
                                type="button"
                                onClick={() => setMachineForm(f => ({ ...f, gameType: gt.value }))}
                                className={[
                                    "flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition",
                                    machineForm.gameType === gt.value
                                        ? "border-[#145de7] bg-[#145de7]/5"
                                        : "border-border hover:border-[#145de7]/40 hover:bg-muted/30",
                                ].join(" ")}
                            >
                                <span className="text-2xl">{gt.icon}</span>
                                <div>
                                    <p className={`text-sm font-bold ${machineForm.gameType === gt.value ? "text-[#145de7]" : "text-foreground"}`}>
                                        {gt.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{gt.desc}</p>
                                </div>
                                <div className={[
                                    "ml-auto w-4 h-4 rounded-full border-2 flex-shrink-0",
                                    machineForm.gameType === gt.value
                                        ? "border-[#145de7] bg-[#145de7]"
                                        : "border-muted-foreground/30",
                                ].join(" ")} />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* แถว 1: ชื่อตู้กาชา + หมวดหมู่ */}
                    <div>
                        <label htmlFor="addMachineName" className={labelCls}>ชื่อตู้กาชา *</label>
                        <input
                            id="addMachineName"
                            value={machineForm.name}
                            onChange={e => setMachineForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="จำเป็น"
                            className={inputCls}
                        />
                    </div>

                    {/* แถว 2: ประเภทราคา + ราคาต่อครั้ง */}
                    <div>
                        <label htmlFor="addCostType" className={labelCls}>ประเภทราคา</label>
                        <select
                            id="addCostType"
                            value={machineForm.costType}
                            onChange={e => setMachineForm(f => ({ ...f, costType: e.target.value, costAmount: 0 }))}
                            className={inputCls}
                        >
                            <option value="FREE">ฟรี</option>
                            <option value="CREDIT">เครดิต</option>
                            <option value="POINT">พอยต์</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="addCostAmount" className={`${labelCls} ${machineForm.costType === "FREE" ? "opacity-40" : ""}`}>
                            ราคาต่อครั้ง {machineForm.costType === "FREE" && <span className="font-normal text-muted-foreground">(ไม่ใช้เมื่อเลือก ฟรี)</span>}
                        </label>
                        <input
                            id="addCostAmount"
                            type="number"
                            value={machineForm.costType === "FREE" ? "" : machineForm.costAmount}
                            onChange={e => setMachineForm(f => ({ ...f, costAmount: Number(e.target.value) }))}
                            min={0}
                            placeholder={machineForm.costType === "FREE" ? "—" : "0"}
                            disabled={machineForm.costType === "FREE"}
                            className={`${inputCls} disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-muted/40`}
                        />
                    </div>

                </div>

                {/* ── รูปภาพ ── */}
                <div className="mt-4">
                    <label htmlFor="addMachineImageFile" className={labelCls}>รูปภาพตู้กาชา</label>
                    <p className="text-xs text-muted-foreground mb-2">อัปโหลดรูป หรือวาง URL รูปภาพ — รองรับ JPG, PNG, WebP, GIF สูงสุด 5MB และระบบจะย่อ บีบอัด และแปลงไฟล์ให้อัตโนมัติ</p>

                    {/* Preview + upload zone */}
                    <div className="flex items-start gap-3">
                        {/* Preview / Drop box */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-20 h-20 rounded-xl border-2 border-dashed flex-shrink-0 overflow-hidden flex items-center justify-center transition-colors cursor-pointer
                                ${isDragging ? "border-[#145de7] bg-[#145de7]/10" : "border-border bg-muted/30"}
                            `}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                const file = e.dataTransfer.files?.[0];
                                if (file) handleImageUpload(file);
                            }}
                        >
                            {validImageUrl(machineForm.imageUrl) ? (
                                <Image src={machineForm.imageUrl} alt="preview" width={80} height={80} className="w-full h-full object-cover pointer-events-none" />
                            ) : (
                                <ImageIcon className={`w-7 h-7 ${isDragging ? "text-[#145de7]" : "text-muted-foreground/40"}`} />
                            )}
                        </button>

                        <div className="flex-1 space-y-2">
                            {/* Hidden file input */}
                            <input
                                id="addMachineImageFile"
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="hidden"
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageUpload(file);
                                    e.target.value = "";
                                }}
                            />

                            {/* Upload button */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingImage}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted/50 text-sm font-medium transition disabled:opacity-50"
                            >
                                {uploadingImage ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}
                                {uploadingImage ? "กำลังอัปโหลด..." : "อัปโหลดรูป"}
                            </button>

                            {/* URL input */}
                            <div className="flex items-center gap-2">
                                <input
                                    value={machineForm.imageUrl}
                                    onChange={e => setMachineForm(f => ({ ...f, imageUrl: e.target.value }))}
                                    placeholder="หรือวาง URL รูปภาพเช่น https://..."
                                    className={inputCls}
                                />
                                {machineForm.imageUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setMachineForm(f => ({ ...f, imageUrl: "" }))}
                                        className="text-red-400 hover:text-red-600 transition flex-shrink-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── รายละเอียด ── */}
                <div className="mt-4">
                    <label htmlFor="addMachineDescription" className={labelCls}>รายละเอียด</label>
                    <textarea
                        id="addMachineDescription"
                        value={machineForm.description}
                        onChange={e => setMachineForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="อธิบายตู้กาชานี้ เช่น ประเภทรางวัล โอกาสชนะ หรือกติกาพิเศษ..."
                        rows={3}
                        className={inputCls + " resize-none"}
                    />
                </div>

                <button
                    onClick={() => addMachine()}
                    disabled={savingMachine}
                    className="mt-6 w-full py-3 rounded-xl bg-[#145de7] hover:bg-[#1148c0] text-white font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {savingMachine ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    เพิ่มตู้กาชา
                </button>
            </div>

            {/* ── รายการตู้กาชา ── */}
            {machines.length > 0 && (
                <MachineTable
                    machines={machines}
                    onToggle={toggleMachine}
                    onDelete={deleteMachine}
                    onRefresh={() => loadAll(true)}
                />
            )}
        </div>
    );
}

// ── Sortable row component ────────────────────────────────────────────────
function SortableRow({
    m,
    i,
    page,
    perPage,
    togglingMap,
    duplicatingId,
    handleToggle,
    handleDuplicate,
    onDelete,
    gameTypeLabel,
}: Readonly<{
    m: GachaMachine;
    i: number;
    page: number;
    perPage: number;
    togglingMap: Record<string, boolean>;
    duplicatingId: string | null;
    handleToggle: (id: string, field: "isActive" | "isEnabled", val: boolean) => void;
    handleDuplicate: (id: string, name: string) => void;
    onDelete: (id: string) => void;
    gameTypeLabel: (gt: string) => string;
}>) {
    const router = useRouter();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: m.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: isDragging ? "hsl(var(--muted))" : undefined,
        zIndex: isDragging ? 10 : undefined,
    };

    return (
        <tr ref={setNodeRef} style={style} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
            {/* drag handle + row number */}
            <td className="px-3 py-2.5 text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground p-0.5 rounded touch-none"
                        title="ลากเพื่อเรียงลำดับ"
                    >
                        <GripVertical className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs">{(page - 1) * perPage + i + 1}</span>
                </div>
            </td>
            <td className="px-3 py-2.5">
                {validImageUrl(m.imageUrl) ? (
                    <Image src={m.imageUrl!} alt={m.name} width={36} height={36} className="w-9 h-9 rounded-lg object-cover" />
                ) : (
                    <div className="w-9 h-9 rounded-lg bg-[#eef4ff] flex items-center justify-center">
                        <LayoutGrid className="w-4 h-4 text-[#145de7]/40" />
                    </div>
                )}
            </td>
            <td className="px-3 py-2.5 font-medium text-foreground max-w-[160px] truncate">{m.name}</td>
            <td className="px-3 py-2.5">
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#eef4ff] text-[#145de7] font-semibold">
                    {gameTypeLabel(m.gameType)}
                </span>
            </td>
            <td className="px-3 py-2.5 text-foreground whitespace-nowrap">
                {m.costType === "FREE" && <span className="text-green-600 font-medium">ฟรี</span>}
                {m.costType === "CREDIT" && `${Number(m.costAmount).toLocaleString()} เครดิต`}
                {m.costType === "POINT" && `${Number(m.costAmount).toLocaleString()} พอยต์`}
            </td>
            <td className="px-3 py-2.5 text-muted-foreground">{m._count.rewards}</td>
            <td className="px-3 py-2.5">
                <button
                    onClick={() => handleToggle(m.id, "isActive", !m.isActive)}
                    disabled={togglingMap[m.id]}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${m.isActive ? "bg-[#145de7]" : "bg-gray-300 dark:bg-zinc-600"}`}
                    title={m.isActive ? "คลิกเพื่อซ่อน" : "คลิกเพื่อแสดง"}
                >
                    <span className={`inline-flex h-4 w-4 items-center justify-center transform rounded-full bg-white shadow transition-transform duration-200 ${m.isActive ? "translate-x-6" : "translate-x-1"}`}>
                        {togglingMap[m.id] && <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />}
                    </span>
                </button>
            </td>
            <td className="px-3 py-2.5">
                <button
                    onClick={() => handleDuplicate(m.id, m.name)}
                    disabled={duplicatingId === m.id}
                    className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 flex items-center justify-center transition disabled:opacity-50"
                    title="คัดลอก"
                >
                    {duplicatingId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
            </td>
            <td className="px-3 py-2.5">
                <button
                    onClick={() => router.push(`/admin/gacha-machines/${m.id}/edit`)}
                    className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10 dark:hover:text-violet-400 flex items-center justify-center transition"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
            </td>
            <td className="px-3 py-2.5">
                <button
                    onClick={() => onDelete(m.id)}
                    className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 flex items-center justify-center transition"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </td>
        </tr>
    );
}

// ── Data table component ───────────────────────────────────────────────────
function MachineTable({
    machines,
    onToggle,
    onDelete,
    onRefresh,
}: Readonly<{
    machines: GachaMachine[];

    onToggle: (id: string, field: "isActive" | "isEnabled", val: boolean) => Promise<void> | void;
    onDelete: (id: string) => void;
    onRefresh: () => void;
}>) {
    const [search, setSearch] = useState("");
    const filterCategory = "";
    const [perPage, setPerPage] = useState(10);
    const [page, setPage] = useState(1);
    const [sortField, setSortField] = useState<"name" | "costAmount" | "isActive" | null>(null);
    const [sortAsc, setSortAsc] = useState(true);
    const [togglingMap, setTogglingMap] = useState<Record<string, boolean>>({});
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
    const [localMachines, setLocalMachines] = useState<GachaMachine[]>(machines);

    // Sync when prop changes
    useEffect(() => { setLocalMachines(machines); }, [machines]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = localMachines.findIndex(m => m.id === active.id);
        const newIndex = localMachines.findIndex(m => m.id === over.id);
        const reordered = arrayMove(localMachines, oldIndex, newIndex);
        setLocalMachines(reordered);

        // Persist to DB
        try {
            await fetch("/api/admin/gacha-machines/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orders: reordered.map((m, idx) => ({ id: m.id, sortOrder: idx })),
                }),
            });
        } catch {
            // Revert on failure
            setLocalMachines(machines);
            showError("เกิดข้อผิดพลาดในการบันทึกลำดับ");
        }
    };

    // Toggle wrapper with loading state
    const handleToggle = async (id: string, field: "isActive" | "isEnabled", val: boolean) => {
        if (togglingMap[id]) return;
        setTogglingMap(p => ({ ...p, [id]: true }));
        try { await onToggle(id, field, val); }
        finally { setTogglingMap(p => ({ ...p, [id]: false })); }
    };

    const handleDuplicate = async (id: string, name: string) => {
        setDuplicatingId(id);
        try {
            const res = await fetch(`/api/admin/gacha-machines/${id}/duplicate`, { method: "POST" });
            const json = await res.json() as { success: boolean; message?: string };
            if (json.success) { showSuccess(`คัดลอก "${name}" สำเร็จ`); onRefresh(); }
            else showError(json.message ?? "เกิดข้อผิดพลาดในการคัดลอก");
        } catch { showError("เกิดข้อผิดพลาดในการคัดลอก"); }
        finally { setDuplicatingId(null); }
    };

    const handleSort = (field: "name" | "costAmount" | "isActive") => {
        if (sortField === field) { setSortAsc(!sortAsc); }
        else { setSortField(field); setSortAsc(true); }
    };

    const sortedAndFiltered = localMachines
        .filter(m => {
            const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
                (m.category?.name ?? "").toLowerCase().includes(search.toLowerCase());
            const matchCategory = !filterCategory || m.categoryId === filterCategory;
            return matchSearch && matchCategory;
        })
        .sort((a, b) => {
            if (!sortField) return 0;
            const aVal = a[sortField];
            const bVal = b[sortField];
            if (sortField === "name") {
                const cmp = String(aVal).localeCompare(String(bVal));
                return sortAsc ? cmp : -cmp;
            } else {
                if (aVal === bVal) return 0;
                const cmp = aVal < bVal ? -1 : 1;
                return sortAsc ? cmp : -cmp;
            }
        });

    const totalPages = Math.max(1, Math.ceil(sortedAndFiltered.length / perPage));
    const paged = sortedAndFiltered.slice((page - 1) * perPage, page * perPage);

    const gameTypeLabel = (gt: string) => gt === "GRID_3X3" ? "3×3" : "สุ่มตัว X";

    return (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>แสดง</span>
                    <select
                        value={perPage}
                        onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                        className="border border-border rounded px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#145de7]"
                    >
                        {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <span>ลำดับ</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>ค้นหา</span>
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder=""
                        className="border border-border rounded px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#145de7] w-40"
                    />
                </div>
            </div>

            {/* Table */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e)}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40">
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">ลำดับ</th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">รูป</th>
                                <th
                                    className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none group"
                                    onClick={() => handleSort("name")}
                                >
                                    <div className="flex items-center gap-1">ชื่อ {sortField === "name" && (sortAsc ? "↑" : "↓")}</div>
                                </th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">มินิเกม</th>
                                <th
                                    className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none group"
                                    onClick={() => handleSort("costAmount")}
                                >
                                    <div className="flex items-center gap-1">ราคา {sortField === "costAmount" && (sortAsc ? "↑" : "↓")}</div>
                                </th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">รางวัล</th>
                                <th
                                    className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none group"
                                    onClick={() => handleSort("isActive")}
                                >
                                    <div className="flex items-center gap-1">สถานะ {sortField === "isActive" && (sortAsc ? "↑" : "↓")}</div>
                                </th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">คัดลอก</th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">แก้ไข</th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">ลบ</th>
                            </tr>
                        </thead>
                        <SortableContext items={paged.map(m => m.id)} strategy={verticalListSortingStrategy}>
                            <tbody>
                                {paged.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-10 text-muted-foreground text-sm">ไม่พบรายการ</td>
                                    </tr>
                                ) : paged.map((m, i) => (
                                    <SortableRow
                                        key={m.id}
                                        m={m}
                                        i={i}
                                        page={page}
                                        perPage={perPage}
                                        togglingMap={togglingMap}
                                        duplicatingId={duplicatingId}
                                        handleToggle={handleToggle}
                                        handleDuplicate={handleDuplicate}
                                        onDelete={onDelete}
                                        gameTypeLabel={gameTypeLabel}
                                    />
                                ))}
                            </tbody>
                        </SortableContext>
                    </table>
                </div>
            </DndContext>


            {/* Footer */}
            <div className="px-4 py-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>แสดง {sortedAndFiltered.length === 0 ? 0 : (page - 1) * perPage + 1} ถึง {Math.min(page * perPage, sortedAndFiltered.length)} จาก {sortedAndFiltered.length} รายการ</span>
                <div className="flex gap-1">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 rounded border border-border text-xs hover:bg-muted transition disabled:opacity-40"
                    >ก่อนหน้า</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map(p => (
                        <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`px-3 py-1.5 rounded border text-xs transition ${p === page ? "bg-[#145de7] text-white border-[#145de7]" : "border-border hover:bg-muted"}`}
                        >{p}</button>
                    ))}
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1.5 rounded border border-border text-xs hover:bg-muted transition disabled:opacity-40"
                    >ถัดไป</button>
                </div>
            </div>
        </div>
    );
}

