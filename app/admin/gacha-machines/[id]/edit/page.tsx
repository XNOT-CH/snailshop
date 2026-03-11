"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save, Trash2, Pencil, Gift, LayoutGrid, X, Plus, Upload, ImageIcon } from "lucide-react";
import { showSuccess, showError, showDeleteConfirm } from "@/lib/swal";
import Image from "next/image";

interface GachaReward {
    id: string;
    rewardType: string;
    tier: string;
    isActive: boolean;
    probability: number;
    rewardName: string | null;
    rewardAmount: number | null;
    rewardImageUrl: string | null;
    productId: string | null;
    product: {
        id: string;
        name: string;
        price: number;
        imageUrl: string | null;
        category: string;
        isSold: boolean;
    } | null;
}

const inputCls = "w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#145de7]/30 focus:border-[#145de7] transition disabled:opacity-40";
const labelCls = "block text-[13px] font-semibold text-[#145de7] mb-1.5";

function validImageUrl(url: string | null | undefined): boolean {
    return !!url && (url.startsWith("/") || url.startsWith("http"));
}

const TIER_OPTIONS = [
    { value: "common", label: "ธรรมดา" },
    { value: "rare", label: "หายาก" },
    { value: "epic", label: "มหากาพย์" },
    { value: "legendary", label: "ตำนาน" },
];

const TIER_COLORS: Record<string, string> = {
    common: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    rare: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    epic: "bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
    legendary: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

const defaultAddForm = {
    rewardName: "",
    probability: "" as string | number,
    rewardAmount: "" as string | number,
    rewardType: "POINT",
    productId: "",
    tier: "common",
    rewardImageUrl: "",
};

export default function EditGachaMachinePage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [machineName, setMachineName] = useState("");
    const [loading, setLoading] = useState(true);

    // rewards
    const [rewards, setRewards] = useState<GachaReward[]>([]);
    const [rewardsLoading, setRewardsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [rewardPerPage, setRewardPerPage] = useState(10);
    const [rewardPage, setRewardPage] = useState(1);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // add reward form
    const [addForm, setAddForm] = useState(defaultAddForm);
    const [addSaving, setAddSaving] = useState(false);
    const [addUploadingImage, setAddUploadingImage] = useState(false);
    const addFileInputRef = useRef<HTMLInputElement>(null);
    const [isAddDragging, setIsAddDragging] = useState(false);

    // edit reward modal
    const [editReward, setEditReward] = useState<GachaReward | null>(null);
    const [editSaving, setEditSaving] = useState(false);
    const [editUploadingImage, setEditUploadingImage] = useState(false);
    const [isEditDragging, setIsEditDragging] = useState(false);
    const editFileInputRef = useRef<HTMLInputElement>(null);
    const [editForm, setEditForm] = useState({
        rewardName: "",
        probability: 1,
        rewardAmount: 0,
        rewardType: "POINT",
        productId: "",
        tier: "common",
        rewardImageUrl: "",
    });

    // products for product picker
    const [products, setProducts] = useState<{ id: string; name: string; imageUrl: string | null; price: number; category: string; stockCount: number }[]>([]);
    const [productSearch, setProductSearch] = useState("");
    const [productCategory, setProductCategory] = useState("");
    const [editProductSearch, setEditProductSearch] = useState("");
    const [editProductCategory, setEditProductCategory] = useState("");

    const loadMachine = useCallback(async () => {
        try {
            const res = await fetch(`/api/admin/gacha-machines/${id}`);
            const json = await res.json() as { success: boolean; data: { name: string } };
            if (json.success) {
                setMachineName(json.data.name);
            } else {
                showError("ไม่พบตู้กาชา");
                router.push("/admin/gacha-machines");
            }
        } catch { showError("โหลดข้อมูลไม่ได้"); }
        finally { setLoading(false); }
    }, [id, router]);

    const loadRewards = useCallback(async () => {
        setRewardsLoading(true);
        try {
            const res = await fetch(`/api/admin/gacha-rewards?machineId=${id}`);
            const json = await res.json() as { success: boolean; data: GachaReward[] };
            if (json.success) setRewards(json.data);
        } catch { /* ignore */ } finally { setRewardsLoading(false); }
    }, [id]);

    useEffect(() => {
        void loadMachine();
        void loadRewards();
        // Load products for product picker
        fetch("/api/admin/gacha-products")
            .then(r => r.json())
            .then((j: { success: boolean; data?: { id: string; name: string; imageUrl: string | null; price: number; category: string; stockCount: number }[] }) => {
                if (j.success && j.data) setProducts(j.data);
            })
            .catch(() => { /* ignore */ });
    }, [loadMachine, loadRewards]);

    // ── Add reward ──
    const handleAddReward = async () => {
        if (addForm.rewardType === "PRODUCT") {
            if (!addForm.productId) return showError("กรุณาเลือกสินค้า");
        } else {
            if (!String(addForm.rewardName).trim()) return showError("กรุณากรอกชื่อรางวัล");
        }
        const prob = Number(addForm.probability);
        if (!prob || prob <= 0 || prob > 100) return showError("โอกาสได้รับต้องอยู่ระหว่าง 0.01-100");
        const currentTotal = rewards.reduce((sum, r) => sum + Number(r.probability ?? 0), 0);
        if (currentTotal + prob > 100) return showError(`โอกาสรวมทั้งหมดต้องไม่เกิน 100% (ปัจจุบันใช้ไป ${Math.round(currentTotal * 100) / 100}% เหลือ ${Math.max(0, Math.round((100 - currentTotal) * 100) / 100)}%)`);
        setAddSaving(true);
        try {
            const body = addForm.rewardType === "PRODUCT"
                ? { rewardType: "PRODUCT", productId: addForm.productId, probability: prob, tier: addForm.tier, gachaMachineId: id }
                : {
                    rewardType: addForm.rewardType,
                    rewardName: String(addForm.rewardName).trim(),
                    probability: prob,
                    rewardAmount: Number(addForm.rewardAmount) || null,
                    tier: addForm.tier,
                    rewardImageUrl: addForm.rewardImageUrl || null,
                    gachaMachineId: id,
                };
            const res = await fetch("/api/admin/gacha-rewards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const json = await res.json() as { success: boolean; message?: string };
            if (json.success) {
                showSuccess("เพิ่มรางวัลสำเร็จ");
                setAddForm(defaultAddForm);
                setProductSearch("");
                void loadRewards();
            } else { showError(json.message ?? "เพิ่มไม่สำเร็จ"); }
        } catch { showError("เกิดข้อผิดพลาด"); } finally { setAddSaving(false); }
    };

    // ── Upload image (shared) ──
    const handleImageUpload = async (
        file: File,
        setUrl: (url: string) => void,
        setUploading: (v: boolean) => void
    ) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/admin/gacha-rewards/upload-image", {
                method: "POST",
                body: formData,
            });
            const json = await res.json() as { success: boolean; url?: string; message?: string };
            if (json.success && json.url) {
                setUrl(json.url);
                showSuccess("อัปโหลดรูปสำเร็จ");
            } else {
                showError(json.message ?? "อัปโหลดไม่สำเร็จ");
            }
        } catch { showError("เกิดข้อผิดพลาดในการอัปโหลด"); }
        finally { setUploading(false); }
    };

    // ── Delete reward ──
    const handleDeleteReward = async (rewardId: string) => {
        if (!await showDeleteConfirm("รางวัลนี้")) return;
        setDeletingId(rewardId);
        try {
            await fetch(`/api/admin/gacha-rewards/${rewardId}`, { method: "DELETE" });
            void loadRewards();
        } finally { setDeletingId(null); }
    };

    // ── Edit reward ──
    const openEdit = (r: GachaReward) => {
        setEditReward(r);
        setEditForm({
            rewardName: r.rewardType === "PRODUCT" ? (r.product?.name ?? "") : (r.rewardName ?? ""),
            probability: r.probability ?? 1,
            rewardAmount: r.rewardAmount ?? 0,
            rewardType: r.rewardType ?? "POINT",
            productId: r.productId ?? "",
            tier: r.tier,
            rewardImageUrl: r.rewardImageUrl ?? (r.product?.imageUrl ?? ""),
        });
        setEditProductSearch("");
    };
    const closeEdit = () => setEditReward(null);

    const handleEditSave = async () => {
        if (!editReward) return;
        if (editForm.rewardType === "PRODUCT") {
            if (!editForm.productId) return showError("กรุณาเลือกสินค้า");
        } else {
            if (!editForm.rewardName.trim()) return showError("กรุณากรอกชื่อรางวัล");
        }
        if (editForm.probability <= 0 || editForm.probability > 100) return showError("โอกาสได้รับต้องอยู่ระหว่าง 0.01-100");
        const otherTotal = rewards.filter(r => r.id !== editReward.id).reduce((sum, r) => sum + Number(r.probability ?? 0), 0);
        if (otherTotal + editForm.probability > 100) return showError(`โอกาสรวมทั้งหมดต้องไม่เกิน 100% (รางวัลอื่นใช้ไป ${Math.round(otherTotal * 100) / 100}% เหลือ ${Math.max(0, Math.round((100 - otherTotal) * 100) / 100)}%)`);
        setEditSaving(true);
        const body = editForm.rewardType === "PRODUCT"
            ? { rewardType: "PRODUCT", productId: editForm.productId, probability: editForm.probability, tier: editForm.tier }
            : {
                rewardType: editForm.rewardType,
                rewardName: editForm.rewardName,
                probability: editForm.probability,
                rewardAmount: editForm.rewardAmount || null,
                tier: editForm.tier,
                rewardImageUrl: editForm.rewardImageUrl || null,
            };
        try {
            const res = await fetch(`/api/admin/gacha-rewards/${editReward.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const json = await res.json() as { success: boolean };
            if (json.success) { showSuccess("บันทึกรางวัลสำเร็จ"); closeEdit(); void loadRewards(); }
            else showError("บันทึกไม่สำเร็จ");
        } catch { showError("เกิดข้อผิดพลาด"); } finally { setEditSaving(false); }
    };

    // ── Pagination & Sorting ──
    const [sortField, setSortField] = useState<"name" | "probability" | "tier" | null>(null);
    const [sortAsc, setSortAsc] = useState(true);

    const handleSort = (field: "name" | "probability" | "tier") => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
    };

    const getRewardName = (r: GachaReward) => r.rewardType === "PRODUCT" ? (r.product?.name ?? "Unknown Product") : (r.rewardName || "Unknown");

    const filteredRewards = rewards.filter(r => {
        const name = getRewardName(r).toLowerCase();
        return name.includes(searchQuery.toLowerCase());
    });

    const sortedRewards = [...filteredRewards].sort((a, b) => {
        if (!sortField) return 0;

        let aVal: any = "";
        let bVal: any = "";

        if (sortField === "name") {
            aVal = getRewardName(a);
            bVal = getRewardName(b);
        } else if (sortField === "probability") {
            aVal = Number(a.probability);
            bVal = Number(b.probability);
        } else if (sortField === "tier") {
            aVal = a.tier;
            bVal = b.tier;
        }

        if (aVal === bVal) return 0;

        if (typeof aVal === "number" && typeof bVal === "number") {
            return sortAsc ? aVal - bVal : bVal - aVal;
        }

        const cmp = String(aVal).localeCompare(String(bVal));
        return sortAsc ? cmp : -cmp;
    });

    const totalRewardPages = Math.max(1, Math.ceil(sortedRewards.length / rewardPerPage));
    const paginatedRewards = sortedRewards.slice((rewardPage - 1) * rewardPerPage, rewardPage * rewardPerPage);

    // ── Total probability used ──
    const totalUsed = Math.round(rewards.reduce((sum, r) => sum + Number(r.probability ?? 0), 0) * 100) / 100;
    const remaining = Math.max(0, Math.round((100 - totalUsed) * 100) / 100);

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => router.push("/admin/gacha-machines")} className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-base font-bold text-[#145de7]">{machineName || "ตู้กาชา"}</h1>
                    <p className="text-xs text-muted-foreground">จัดการรางวัล</p>
                </div>
            </div>

            {/* ── จัดการรางวัล ── */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">

                {/* Section header */}
                <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                    <Gift className="w-4 h-4 text-[#145de7]" />
                    <div>
                        <p className="text-[11px] text-muted-foreground">รางวัล</p>
                        <h2 className="text-base font-bold text-[#145de7] leading-none">จัดการรางวัล</h2>
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">{rewards.length} รายการ</span>
                </div>

                {/* Probability gauge */}
                <div className="px-6 py-3 border-b border-border bg-muted/10">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-muted-foreground">โอกาสรวมที่ใช้ไป</span>
                        <span className={`text-xs font-bold ${totalUsed >= 100 ? "text-red-500" : totalUsed >= 80 ? "text-amber-500" : "text-emerald-500"}`}>
                            {totalUsed}% / 100%
                        </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${totalUsed >= 100 ? "bg-red-500" : totalUsed >= 80 ? "bg-amber-400" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(100, totalUsed)}%` }}
                        />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                        {totalUsed >= 100
                            ? "⛔ ไม่สามารถเพิ่มรางวัลได้อีก (ใช้ครบ 100%)"
                            : `✅ เหลือโอกาส ${remaining}% สำหรับรางวัลเพิ่มเติม`}
                    </p>
                </div>

                {/* ── Add reward form ── */}
                <div className="px-6 py-5 border-b border-border bg-muted/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="addRewardName" className={labelCls}>ชื่อรางวัล *</label>
                            <input
                                id="addRewardName"
                                value={addForm.rewardName}
                                onChange={e => setAddForm(f => ({ ...f, rewardName: e.target.value }))}
                                placeholder="จำเป็น"
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label htmlFor="addProbability" className={labelCls}>โอกาสได้รับ (%) *</label>
                            <input
                                id="addProbability"
                                type="number"
                                value={addForm.probability}
                                onChange={e => setAddForm(f => ({ ...f, probability: e.target.value }))}
                                placeholder="รวมโอกาสของรางวัลทั้งหมดต้องไม่เกิน 100%"
                                min={0.01}
                                max={100}
                                step={0.01}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label htmlFor="addRewardType" className={labelCls}>ประเภทรางวัล *</label>
                            <select
                                id="addRewardType"
                                value={addForm.rewardType}
                                onChange={e => setAddForm(f => ({ ...f, rewardType: e.target.value, productId: "", rewardAmount: "" }))}
                                className={inputCls}
                            >
                                <option value="POINT">พอย</option>
                                <option value="CREDIT">เครดิต</option>
                                <option value="PRODUCT">สินค้าในเว็บ</option>
                            </select>
                        </div>
                        {addForm.rewardType === "PRODUCT" ? (
                            <div className="md:col-span-1">
                                <label htmlFor="addProductCategory" className={labelCls}>เลือกสินค้า *</label>
                                <select
                                    id="addProductCategory"
                                    value={productCategory}
                                    onChange={e => { setProductCategory(e.target.value); setProductSearch(""); setAddForm(f => ({ ...f, productId: "", rewardName: "" })); }}
                                    className={inputCls + " mb-2"}
                                >
                                    <option value="">— เลือกหมวดหมู่ —</option>
                                    {[...new Set(products.map(p => p.category))].sort((a, b) => a.localeCompare(b)).map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <div className="relative">
                                    <input
                                        value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
                                        placeholder="ค้นหาชื่อสินค้า..."
                                        className={inputCls}
                                    />
                                    {(productSearch || productCategory) && (
                                        <div className="absolute left-0 right-0 top-full mt-1 border border-border rounded-lg bg-background shadow-xl max-h-52 overflow-y-auto z-50">
                                            {products
                                                .filter(p => p.stockCount > 0 && (!productCategory || p.category === productCategory) && p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                                .slice(0, 10).map(p => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => { setAddForm(f => ({ ...f, productId: p.id, rewardName: p.name })); setProductSearch(""); setProductCategory(""); }}
                                                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition flex items-center gap-2 border-b border-border/50 last:border-0"
                                                    >
                                                        {p.imageUrl && <Image src={p.imageUrl} alt={p.name} width={28} height={28} className="w-7 h-7 rounded object-cover flex-shrink-0" unoptimized />}
                                                        <span className="truncate flex-1">{p.name}</span>
                                                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex-shrink-0">สต็อก {p.stockCount}</span>
                                                        <span className="text-xs text-muted-foreground flex-shrink-0">฿{Number(p.price).toLocaleString()}</span>
                                                    </button>
                                                ))}
                                            {products.filter(p => p.stockCount > 0 && (!productCategory || p.category === productCategory) && p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                                                <p className="px-3 py-2 text-sm text-muted-foreground">ไม่พบสินค้าที่มีสต็อก</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {addForm.productId && (
                                    <p className="mt-1 text-xs text-[#145de7] font-medium">✓ เลือก: {addForm.rewardName}</p>
                                )}
                            </div>
                        ) : (
                            <div>
                                <label htmlFor="addRewardAmount" className={labelCls}>จำนวนที่จะได้รับ *</label>
                                <input
                                    id="addRewardAmount"
                                    type="number"
                                    value={addForm.rewardAmount}
                                    onChange={e => setAddForm(f => ({ ...f, rewardAmount: e.target.value }))}
                                    placeholder="เช่น 100"
                                    min={0}
                                    className={inputCls}
                                />
                            </div>
                        )}
                        <div>
                            <label htmlFor="addRewardTier" className={labelCls}>รูปแบบรางวัล *</label>
                            <select
                                id="addRewardTier"
                                value={addForm.tier}
                                onChange={e => setAddForm(f => ({ ...f, tier: e.target.value }))}
                                className={inputCls}
                            >
                                {TIER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Add — รูปภาพ */}
                    <div className="mt-4">
                        <label htmlFor="addRewardImageFile" className={labelCls}>รูปภาพรางวัล</label>
                        <p className="text-xs text-muted-foreground mb-2">อัปโหลดรูป หรือวาง URL — รองรับ JPG, PNG, WebP, GIF (สูงสุด 5MB)</p>
                        <input
                            ref={addFileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) void handleImageUpload(file, (url) => setAddForm(f => ({ ...f, rewardImageUrl: url })), setAddUploadingImage);
                                e.target.value = "";
                            }}
                        />
                        <div className="flex items-center gap-2">
                            {/* Preview / Drop box */}
                            <button
                                type="button"
                                onClick={() => addFileInputRef.current?.click()}
                                className={`w-12 h-12 rounded-lg border-2 border-dashed flex items-center justify-center flex-shrink-0 overflow-hidden transition-colors cursor-pointer
                                    ${isAddDragging ? "border-[#145de7] bg-[#145de7]/10" : "border-border bg-muted/20"}
                                `}
                                onDragOver={(e) => { e.preventDefault(); setIsAddDragging(true); }}
                                onDragLeave={() => setIsAddDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsAddDragging(false);
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) void handleImageUpload(file, (url) => setAddForm(f => ({ ...f, rewardImageUrl: url })), setAddUploadingImage);
                                }}
                            >
                                {validImageUrl(String(addForm.rewardImageUrl)) ? (
                                    <Image src={String(addForm.rewardImageUrl)} alt="preview" width={48} height={48} className="w-full h-full object-cover pointer-events-none" />
                                ) : (
                                    <ImageIcon className={`w-5 h-5 ${isAddDragging ? "text-[#145de7]" : "text-muted-foreground/40"}`} />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => addFileInputRef.current?.click()}
                                disabled={addUploadingImage}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-muted/50 text-xs font-medium transition disabled:opacity-50 flex-shrink-0"
                            >
                                {addUploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                {addUploadingImage ? "กำลังอัปโหลด..." : "อัปโหลด"}
                            </button>
                            <input
                                id="addRewardImageUrl"
                                value={String(addForm.rewardImageUrl)}
                                onChange={e => setAddForm(f => ({ ...f, rewardImageUrl: e.target.value }))}
                                placeholder="หรือวาง URL รูปภาพ"
                                className={inputCls}
                            />
                            {addForm.rewardImageUrl && (
                                <button type="button" onClick={() => setAddForm(f => ({ ...f, rewardImageUrl: "" }))} className="text-red-400 hover:text-red-600 transition flex-shrink-0">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => void handleAddReward()}
                        disabled={addSaving}
                        className="mt-4 w-full py-3 rounded-xl bg-[#145de7] hover:bg-[#1048b8] text-white font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {addSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        เพิ่มรางวัล
                    </button>
                </div>

                {/* Edit reward inline form */}
                {editReward && (
                    <div className="border-b border-border bg-blue-50/60 dark:bg-blue-950/20 px-6 py-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-[#145de7]">แก้ไขรางวัล</h3>
                            <button onClick={closeEdit} className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label htmlFor="editRewardName" className={labelCls}>ชื่อรางวัล *</label><input id="editRewardName" value={editForm.rewardName} onChange={e => setEditForm(f => ({ ...f, rewardName: e.target.value }))} placeholder="จำเป็น" className={inputCls} /></div>
                            <div>
                                <label htmlFor="editProbability" className={labelCls}>โอกาสได้รับ (%) *</label>
                                <input id="editProbability" type="number" value={editForm.probability} onChange={e => setEditForm(f => ({ ...f, probability: Number(e.target.value) }))} placeholder="รวมโอกาสของรางวัลทั้งหมดต้องไม่เกิน 100%" min={0.01} max={100} step={0.01} className={inputCls} />
                            </div>
                            <div>
                                <label htmlFor="editRewardType" className={labelCls}>ประเภทรางวัล *</label>
                                <select
                                    id="editRewardType"
                                    value={editForm.rewardType ?? "POINT"}
                                    onChange={e => setEditForm(f => ({ ...f, rewardType: e.target.value, productId: "", rewardAmount: 0 }))}
                                    className={inputCls}
                                >
                                    <option value="POINT">พอย</option>
                                    <option value="CREDIT">เครดิต</option>
                                    <option value="PRODUCT">สินค้าในเว็บ</option>
                                </select>
                            </div>
                            {editForm.rewardType === "PRODUCT" ? (
                                <div>
                                    <label htmlFor="editProductCategory" className={labelCls}>เลือกสินค้า *</label>
                                    <select
                                        id="editProductCategory"
                                        value={editProductCategory}
                                        onChange={e => { setEditProductCategory(e.target.value); setEditProductSearch(""); setEditForm(f => ({ ...f, productId: "", rewardName: "" })); }}
                                        className={inputCls + " mb-2"}
                                    >
                                        <option value="">— เลือกหมวดหมู่ —</option>
                                        {[...new Set(products.map(p => p.category))].sort((a, b) => a.localeCompare(b)).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    <div className="relative">
                                        <input
                                            id="editProductSearch"
                                            value={editProductSearch}
                                            onChange={e => setEditProductSearch(e.target.value)}
                                            placeholder="ค้นหาชื่อสินค้า..."
                                            className={inputCls}
                                        />
                                        {(editProductSearch || editProductCategory) && (
                                            <div className="absolute left-0 right-0 top-full mt-1 border border-border rounded-lg bg-background shadow-xl max-h-52 overflow-y-auto z-50">
                                                {products
                                                    .filter(p => p.stockCount > 0 && (!editProductCategory || p.category === editProductCategory) && p.name.toLowerCase().includes(editProductSearch.toLowerCase()))
                                                    .slice(0, 10).map(p => (
                                                        <button key={p.id} type="button"
                                                            onClick={() => { setEditForm(f => ({ ...f, productId: p.id, rewardName: p.name })); setEditProductSearch(""); setEditProductCategory(""); }}
                                                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition flex items-center gap-2 border-b border-border/50 last:border-0"
                                                        >
                                                            {p.imageUrl && <Image src={p.imageUrl} alt={p.name} width={28} height={28} className="w-7 h-7 rounded object-cover flex-shrink-0" unoptimized />}
                                                            <span className="truncate flex-1">{p.name}</span>
                                                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex-shrink-0">สต็อก {p.stockCount}</span>
                                                            <span className="text-xs text-muted-foreground flex-shrink-0">฿{Number(p.price).toLocaleString()}</span>
                                                        </button>
                                                    ))}
                                                {products.filter(p => p.stockCount > 0 && (!editProductCategory || p.category === editProductCategory) && p.name.toLowerCase().includes(editProductSearch.toLowerCase())).length === 0 && (
                                                    <p className="px-3 py-2 text-sm text-muted-foreground">ไม่พบสินค้าที่มีสต็อก</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {editForm.productId && (
                                        <p className="mt-1 text-xs text-[#145de7] font-medium">✓ เลือก: {editForm.rewardName}</p>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="editRewardAmount" className={labelCls}>จำนวนที่จะได้รับ *</label>
                                    <input id="editRewardAmount" type="number" value={editForm.rewardAmount} onChange={e => setEditForm(f => ({ ...f, rewardAmount: Number(e.target.value) }))} placeholder="เช่น 100" min={0} className={inputCls} />
                                </div>
                            )}
                            <div>
                                <label htmlFor="editRewardTier" className={labelCls}>รูปแบบรางวัล *</label>
                                <select id="editRewardTier" value={editForm.tier} onChange={e => setEditForm(f => ({ ...f, tier: e.target.value }))} className={inputCls}>
                                    {TIER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2 mt-4">
                                <label htmlFor="editRewardImageFile" className={labelCls}>รูปภาพรางวัล</label>
                                <p className="text-xs text-muted-foreground mb-2">อัปโหลดรูป หรือวาง URL — รองรับ JPG, PNG, WebP, GIF (สูงสุด 5MB)</p>
                                <input
                                    id="editRewardImageFile"
                                    ref={editFileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    className="hidden"
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) void handleImageUpload(file, (url) => setEditForm(f => ({ ...f, rewardImageUrl: url })), setEditUploadingImage);
                                        e.target.value = "";
                                    }}
                                />
                                <div className="flex items-center gap-2">
                                    {/* Preview / Drop box */}
                                    <button
                                        type="button"
                                        onClick={() => editFileInputRef.current?.click()}
                                        className={`w-12 h-12 rounded-lg border-2 border-dashed flex items-center justify-center flex-shrink-0 overflow-hidden transition-colors cursor-pointer
                                                ${isEditDragging ? "border-[#145de7] bg-[#145de7]/10" : "border-border bg-muted/20"}
                                            `}
                                        onDragOver={(e) => { e.preventDefault(); setIsEditDragging(true); }}
                                        onDragLeave={() => setIsEditDragging(false)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setIsEditDragging(false);
                                            const file = e.dataTransfer.files?.[0];
                                            if (file) void handleImageUpload(file, (url) => setEditForm(f => ({ ...f, rewardImageUrl: url })), setEditUploadingImage);
                                        }}
                                    >
                                        {validImageUrl(editForm.rewardImageUrl) ? (
                                            <Image src={editForm.rewardImageUrl} alt="preview" width={48} height={48} className="w-full h-full object-cover pointer-events-none" />
                                        ) : (
                                            <ImageIcon className={`w-5 h-5 ${isEditDragging ? "text-[#145de7]" : "text-muted-foreground/40"}`} />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => editFileInputRef.current?.click()}
                                        disabled={editUploadingImage}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-muted/50 text-xs font-medium transition disabled:opacity-50 flex-shrink-0"
                                    >
                                        {editUploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                        {editUploadingImage ? "กำลังอัปโหลด..." : "อัปโหลด"}
                                    </button>
                                    <input
                                        value={editForm.rewardImageUrl}
                                        onChange={e => setEditForm(f => ({ ...f, rewardImageUrl: e.target.value }))}
                                        placeholder="หรือวาง URL รูปภาพ"
                                        className={inputCls}
                                    />
                                    {editForm.rewardImageUrl && (
                                        <button type="button" onClick={() => setEditForm(f => ({ ...f, rewardImageUrl: "" }))} className="text-red-400 hover:text-red-600 transition flex-shrink-0">
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => void handleEditSave()} disabled={editSaving} className="mt-4 w-full py-3 rounded-xl bg-[#145de7] hover:bg-[#1048b8] text-white font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50">
                            {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} บันทึกรางวัล
                        </button>
                    </div>
                )}

                {/* Toolbar */}
                <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3 justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>แสดง</span>
                        <select value={rewardPerPage} onChange={e => { setRewardPerPage(Number(e.target.value)); setRewardPage(1); }} className="border border-border rounded px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#145de7]">
                            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <span>ลำดับ</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>ค้นหา</span>
                        <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setRewardPage(1); }} placeholder="" className="border border-border rounded px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#145de7] w-40" />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40">
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">ลำดับ</th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">รูปภาพ</th>
                                <th
                                    className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none group"
                                    onClick={() => handleSort("name")}
                                >
                                    <div className="flex items-center gap-1">ชื่อ {sortField === "name" && (sortAsc ? "↑" : "↓")}</div>
                                </th>
                                <th
                                    className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none group"
                                    onClick={() => handleSort("probability")}
                                >
                                    <div className="flex items-center gap-1">โอกาส (%) {sortField === "probability" && (sortAsc ? "↑" : "↓")}</div>
                                </th>
                                <th
                                    className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none group"
                                    onClick={() => handleSort("tier")}
                                >
                                    <div className="flex items-center gap-1">รูปแบบ {sortField === "tier" && (sortAsc ? "↑" : "↓")}</div>
                                </th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">แก้ไข</th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">ลบ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rewardsLoading ? (
                                <tr><td colSpan={7} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" /></td></tr>
                            ) : paginatedRewards.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">ไม่พบรายการ</td></tr>
                            ) : paginatedRewards.map((r, i) => {
                                const imgUrl = r.rewardType === "PRODUCT" ? r.product?.imageUrl : r.rewardImageUrl;
                                const name = r.rewardType === "PRODUCT" ? (r.product?.name ?? "—") : (r.rewardName ?? "—");
                                const isBeingEdited = editReward?.id === r.id;
                                return (
                                    <tr key={r.id} className={`border-b border-border/40 transition-colors ${isBeingEdited ? "bg-violet-50/60 dark:bg-violet-950/20" : "hover:bg-muted/30"}`}>
                                        <td className="px-3 py-2.5 text-muted-foreground">{(rewardPage - 1) * rewardPerPage + i + 1}</td>
                                        <td className="px-3 py-2.5">
                                            {validImageUrl(imgUrl!) ? (
                                                <Image src={imgUrl!} alt={name} width={36} height={36} className="w-9 h-9 rounded-lg object-cover" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-lg bg-[#eff6ff] flex items-center justify-center">
                                                    <LayoutGrid className="w-4 h-4 text-[#145de7]/40" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 font-medium text-foreground max-w-[180px] truncate">{name}</td>
                                        <td className="px-3 py-2.5 text-muted-foreground">{r.probability}%</td>
                                        <td className="px-3 py-2.5">
                                            <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${TIER_COLORS[r.tier] ?? TIER_COLORS.common}`}>
                                                {TIER_OPTIONS.find(t => t.value === r.tier)?.label ?? r.tier}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <button
                                                onClick={() => openEdit(r)}
                                                className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10 dark:hover:text-violet-400 flex items-center justify-center transition"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <button
                                                onClick={() => void handleDeleteReward(r.id)}
                                                className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 flex items-center justify-center transition"
                                            >
                                                {deletingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination footer */}
                <div className="px-4 py-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>แสดง {sortedRewards.length === 0 ? 0 : (rewardPage - 1) * rewardPerPage + 1} ถึง {Math.min(rewardPage * rewardPerPage, sortedRewards.length)} จาก {sortedRewards.length} รายการ</span>
                    <div className="flex gap-1">
                        <button onClick={() => setRewardPage(p => Math.max(1, p - 1))} disabled={rewardPage === 1} className="px-3 py-1.5 rounded border border-border text-xs hover:bg-muted transition disabled:opacity-40">ก่อนหน้า</button>
                        {Array.from({ length: totalRewardPages }, (_, i) => i + 1).slice(Math.max(0, rewardPage - 3), rewardPage + 2).map(p => (
                            <button key={p} onClick={() => setRewardPage(p)} className={`px-3 py-1.5 rounded border text-xs transition ${p === rewardPage ? "bg-[#145de7] text-white border-[#145de7]" : "border-border hover:bg-muted"}`}>{p}</button>
                        ))}
                        <button onClick={() => setRewardPage(p => Math.min(totalRewardPages, p + 1))} disabled={rewardPage === totalRewardPages} className="px-3 py-1.5 rounded border border-border text-xs hover:bg-muted transition disabled:opacity-40">ถัดไป</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
