"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, LayoutGrid, Upload, X, ImageIcon } from "lucide-react";
import { showSuccess, showError, showDeleteConfirm } from "@/lib/swal";
import Image from "next/image";

interface GachaCategory {
    id: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
    _count: { machines: number };
}

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
    return !!url && (url.startsWith("/") || url.startsWith("http"));
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
    const [categories, setCategories] = useState<GachaCategory[]>([]);
    const [machines, setMachines] = useState<GachaMachine[]>([]);
    const [loading, setLoading] = useState(true);

    const [newCatName, setNewCatName] = useState("");
    const [savingCat, setSavingCat] = useState(false);

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [catRes, machRes] = await Promise.all([
                fetch("/api/admin/gacha-categories"),
                fetch("/api/admin/gacha-machines"),
            ]);
            const catJson = await catRes.json() as { success: boolean; data: GachaCategory[] };
            const machJson = await machRes.json() as { success: boolean; data: GachaMachine[] };
            if (catJson.success) setCategories(catJson.data);
            if (machJson.success) setMachines(machJson.data);
        } catch { /* ignore */ }
        setLoading(false);
    };

    useEffect(() => { void loadAll(); }, []);

    const addCategory = async () => {
        if (!newCatName.trim()) return;
        setSavingCat(true);
        try {
            const res = await fetch("/api/admin/gacha-categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newCatName.trim() }),
            });
            const json = await res.json() as { success: boolean };
            if (json.success) { showSuccess("เพิ่มหมวดหมู่แล้ว"); setNewCatName(""); void loadAll(); }
            else showError("เพิ่มไม่สำเร็จ");
        } catch { showError("เกิดข้อผิดพลาด"); } finally { setSavingCat(false); }
    };

    const deleteCategory = async (id: string) => {
        if (!await showDeleteConfirm("หมวดหมู่กาชานี้")) return;
        await fetch(`/api/admin/gacha-categories/${id}`, { method: "DELETE" });
        void loadAll();
    };

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
                void loadAll();
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
        await fetch(`/api/admin/gacha-machines/${id}`, { method: "DELETE" });
        void loadAll();
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

            {/* ── เพิ่มหมวดหมู่ ── */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="mb-5">
                    <h1 className="text-base font-bold text-[#145de7]">หมวดหมู่</h1>
                    <p className="text-xs text-muted-foreground">จัดการหมวดหมู่กาชา</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className={labelCls}>ชื่อหมวดหมู่ *</label>
                        <input
                            value={newCatName}
                            onChange={e => setNewCatName(e.target.value)}
                            placeholder="จำเป็น"
                            className={inputCls}
                            onKeyDown={e => e.key === "Enter" && void addCategory()}
                        />
                    </div>
                </div>
                <button
                    onClick={() => void addCategory()}
                    disabled={savingCat || !newCatName.trim()}
                    className="w-full py-3 rounded-xl bg-[#145de7] hover:bg-[#1148c0] text-white font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {savingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    เพิ่มหมวดหมู่
                </button>

                {categories.length > 0 && (
                    <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {categories.map(cat => (
                            <div key={cat.id} className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-3 border border-border/40">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                                    <p className="text-xs text-muted-foreground">{cat._count.machines} ตู้</p>
                                </div>
                                <button onClick={() => void deleteCategory(cat.id)} className="text-red-400 hover:text-red-600 transition p-1 ml-2">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── เพิ่มตู้กาชา ── */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="mb-5">
                    <h2 className="text-base font-bold text-[#145de7]">ตู้กาชา</h2>
                    <p className="text-xs text-muted-foreground">จัดการตู้กาชา</p>
                </div>

                {/* ── ประเภทมินิเกม ── */}
                <div className="mb-5">
                    <label className={labelCls}>ประเภทมินิเกม *</label>
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
                    {/* ชื่อตู้กาชา */}
                    <div>
                        <label className={labelCls}>ชื่อตู้กาชา *</label>
                        <input
                            value={machineForm.name}
                            onChange={e => setMachineForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="จำเป็น"
                            className={inputCls}
                        />
                    </div>

                    {/* ประเภทราคา */}
                    <div>
                        <label className={labelCls}>ประเภทราคา</label>
                        <select
                            value={machineForm.costType}
                            onChange={e => setMachineForm(f => ({ ...f, costType: e.target.value }))}
                            className={inputCls}
                        >
                            <option value="FREE">ฟรี</option>
                            <option value="CREDIT">เครดิต</option>
                            <option value="POINT">พอยต์</option>
                        </select>
                    </div>

                    {/* หมวดหมู่ */}
                    <div>
                        <label className={labelCls}>หมวดหมู่</label>
                        <select
                            value={machineForm.categoryId}
                            onChange={e => setMachineForm(f => ({ ...f, categoryId: e.target.value }))}
                            className={inputCls}
                        >
                            <option value="">เลือกหมวดหมู่</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {/* ราคาต่อครั้ง */}
                    <div>
                        <label className={labelCls}>ราคาต่อครั้ง</label>
                        <input
                            type="number"
                            value={machineForm.costAmount}
                            onChange={e => setMachineForm(f => ({ ...f, costAmount: Number(e.target.value) }))}
                            min={0}
                            placeholder="0"
                            disabled={machineForm.costType === "FREE"}
                            className={inputCls + " disabled:opacity-40"}
                        />
                    </div>

                    {/* ลิมิตต่อวัน */}
                    <div>
                        <label className={labelCls}>ลิมิตต่อวัน (0 = ไม่จำกัด)</label>
                        <input
                            type="number"
                            value={machineForm.dailySpinLimit}
                            onChange={e => setMachineForm(f => ({ ...f, dailySpinLimit: Number(e.target.value) }))}
                            min={0}
                            placeholder="0"
                            className={inputCls}
                        />
                    </div>

                    {/* ลำดับ */}
                    <div>
                        <label className={labelCls}>ลำดับการแสดง</label>
                        <input
                            type="number"
                            value={machineForm.sortOrder}
                            onChange={e => setMachineForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                            min={0}
                            placeholder="0"
                            className={inputCls}
                        />
                    </div>
                </div>

                {/* ── รูปภาพ ── */}
                <div className="mt-4">
                    <label className={labelCls}>รูปภาพตู้กาชา</label>
                    <p className="text-xs text-muted-foreground mb-2">อัปโหลดรูป หรือวาง URL รูปภาพ — รองรับ JPG, PNG, WebP, GIF (สูงสุด 5MB)</p>

                    {/* Preview + upload zone */}
                    <div className="flex items-start gap-3">
                        {/* Preview box */}
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border bg-muted/30 flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {validImageUrl(machineForm.imageUrl) ? (
                                <Image src={machineForm.imageUrl} alt="preview" width={80} height={80} className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="w-7 h-7 text-muted-foreground/40" />
                            )}
                        </div>

                        <div className="flex-1 space-y-2">
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="hidden"
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) void handleImageUpload(file);
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
                    <label className={labelCls}>รายละเอียด</label>
                    <textarea
                        value={machineForm.description}
                        onChange={e => setMachineForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="อธิบายตู้กาชานี้ เช่น ประเภทรางวัล โอกาสชนะ หรือกติกาพิเศษ..."
                        rows={3}
                        className={inputCls + " resize-none"}
                    />
                </div>

                <button
                    onClick={() => void addMachine()}
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
                />
            )}
        </div>
    );
}

// ── Data table component ───────────────────────────────────────────────────
function MachineTable({
    machines,
    onToggle,
    onDelete,
}: {
    machines: GachaMachine[];
    onToggle: (id: string, field: "isActive" | "isEnabled", val: boolean) => void;
    onDelete: (id: string) => void;
}) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [perPage, setPerPage] = useState(10);
    const [page, setPage] = useState(1);

    const filtered = machines.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.category?.name ?? "").toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const paged = filtered.slice((page - 1) * perPage, page * perPage);

    const gameTypeLabel = (gt: string) =>
        gt === "GRID_3X3" ? "3×3" : "สุ่มตัว X";

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
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/40">
                            {["ลำดับ", "รูป", "ชื่อ", "มินิเกม", "ราคา", "หมวดหมู่", "รางวัล", "สถานะ", "แก้ไข", "ลบ"].map(h => (
                                <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paged.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="text-center py-10 text-muted-foreground text-sm">ไม่พบรายการ</td>
                            </tr>
                        ) : paged.map((m, i) => (
                            <tr key={m.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                                <td className="px-3 py-2.5 text-muted-foreground">{(page - 1) * perPage + i + 1}</td>
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
                                    {m.costType === "FREE" ? (
                                        <span className="text-green-600 font-medium">ฟรี</span>
                                    ) : (
                                        `${Number(m.costAmount).toLocaleString()} ${m.costType === "CREDIT" ? "เครดิต" : "พอยต์"}`
                                    )}
                                </td>
                                <td className="px-3 py-2.5 text-muted-foreground">{m.category?.name ?? "—"}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">{m._count.rewards}</td>
                                <td className="px-3 py-2.5">
                                    <button
                                        onClick={() => onToggle(m.id, "isActive", !m.isActive)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${m.isActive ? "bg-[#145de7]" : "bg-gray-300 dark:bg-zinc-600"}`}
                                        title={m.isActive ? "คลิกเพื่อซ่อน" : "คลิกเพื่อแสดง"}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${m.isActive ? "translate-x-6" : "translate-x-1"}`} />
                                    </button>
                                </td>
                                <td className="px-3 py-2.5">
                                    <button
                                        onClick={() => router.push(`/admin/gacha-machines/${m.id}/edit`)}
                                        className="w-8 h-8 rounded-lg bg-violet-500 hover:bg-violet-600 text-white flex items-center justify-center transition"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                    </button>
                                </td>
                                <td className="px-3 py-2.5">
                                    <button
                                        onClick={() => onDelete(m.id)}
                                        className="w-8 h-8 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>แสดง {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} ถึง {Math.min(page * perPage, filtered.length)} จาก {filtered.length} รายการ</span>
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
