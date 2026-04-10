"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save, Trash2, Pencil, Gift, LayoutGrid, X, Plus, Upload, ImageIcon } from "lucide-react";
import { showSuccess, showError, showDeleteConfirm } from "@/lib/swal";
import { compressImage } from "@/lib/compressImage";
import { resizeFileToSquare } from "@/lib/imageResize";
import { RewardImageCropDialog } from "@/components/gacha/RewardImageCropDialog";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { PERMISSIONS } from "@/lib/permissions";
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
    return url != null && (url.startsWith("/") || url.startsWith("http"));
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

type SimulationRow = {
    id: string;
    name: string;
    configuredProbability: number;
    simulatedCount: number;
    simulatedRate: number;
};

const SIMULATION_RUNS = 10000;

function buildRewardPayload(form: { rewardType: string; productId?: string; probability: string | number; tier: string; rewardName?: string; rewardAmount?: string | number; rewardImageUrl?: string; }, machineId?: string) {
    if (form.rewardType === "PRODUCT") {
        return {
            rewardType: "PRODUCT",
            productId: form.productId,
            probability: form.probability,
            tier: form.tier,
            ...(machineId ? { gachaMachineId: machineId } : {})
        };
    }
    return {
        rewardType: form.rewardType,
        rewardName: typeof form.rewardName === "string" ? form.rewardName.trim() : form.rewardName,
        probability: form.probability,
        rewardAmount: Number(form.rewardAmount) || null,
        tier: form.tier,
        rewardImageUrl: form.rewardImageUrl || null,
        ...(machineId ? { gachaMachineId: machineId } : {})
    };
}

function sortRewards(rewards: GachaReward[], sortField: string | null, sortAsc: boolean, getRewardName: (r: GachaReward) => string) {
    return [...rewards].sort((a, b) => {
        if (!sortField) return 0;

        let aVal: string | number = "";
        let bVal: string | number = "";

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
}

function getSimulationRewardName(reward: GachaReward) {
    return reward.rewardType === "PRODUCT"
        ? (reward.product?.name ?? "Unknown Product")
        : (reward.rewardName || "Unknown");
}

function isRewardEligibleForSimulation(reward: GachaReward) {
    if (reward.rewardType === "PRODUCT") {
        return Boolean(reward.product && !reward.product.isSold);
    }

    return Boolean(reward.rewardAmount && Number(reward.rewardAmount) > 0);
}

function validateReward(form: any, rewards: GachaReward[], ignoreId?: string): string | null {
    if (form.rewardType === "PRODUCT" && !form.productId) return "กรุณาเลือกสินค้า";
    if (form.rewardType !== "PRODUCT" && !String(form.rewardName).trim()) return "กรุณากรอกชื่อรางวัล";
    if (form.rewardType !== "PRODUCT" && Number(form.rewardAmount) <= 0) return "จำนวนที่จะได้รับต้องมากกว่า 0";
    const prob = Number(form.probability);
    if (!prob || prob <= 0 || prob > 100) return "โอกาสได้รับต้องอยู่ระหว่าง 0.01-100";
    const otherTotal = rewards.filter(r => r.id !== ignoreId).reduce((sum, r) => sum + Number(r.probability ?? 0), 0);
    if (otherTotal + prob > 100) return "โอกาสรวมทั้งหมดต้องไม่เกิน 100%";
    return null;
}

interface ProductPickerDropdownProps {
    readonly products: { id: string; name: string; imageUrl: string | null; price: number; category: string; stockCount: number }[];
    readonly search: string;
    readonly category: string;
    readonly onSelect: (product: { id: string; name: string }) => void;
}

function ProductPickerDropdown({ products, search, category, onSelect }: ProductPickerDropdownProps) {
    if (!search && !category) return null;
    const searchFiltered = products.filter(p => p.stockCount > 0 && (!category || p.category === category) && p.name.toLowerCase().includes(search.toLowerCase()));
    if (searchFiltered.length === 0) {
        return (
            <div className="absolute left-0 right-0 top-full mt-1 border border-border rounded-lg bg-background shadow-xl max-h-52 overflow-y-auto z-50">
                <p className="px-3 py-2 text-sm text-muted-foreground">ไม่พบสินค้าที่มีสต็อก</p>
            </div>
        );
    }
    return (
        <div className="absolute left-0 right-0 top-full mt-1 border border-border rounded-lg bg-background shadow-xl max-h-52 overflow-y-auto z-50">
            {searchFiltered.slice(0, 10).map(p => (
                <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelect(p)}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition flex items-center gap-2 border-b border-border/50 last:border-0"
                >
                    {p.imageUrl && <Image src={p.imageUrl} alt={p.name} width={28} height={28} className="w-7 h-7 rounded object-cover flex-shrink-0" unoptimized />}
                    <span className="truncate flex-1">{p.name}</span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex-shrink-0">สต็อก {p.stockCount}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">฿{Number(p.price).toLocaleString()}</span>
                </button>
            ))}
        </div>
    );
}

interface FormComponentProps {
    readonly form: any;
    readonly setForm: React.Dispatch<React.SetStateAction<any>>;
    readonly products: any[];
    readonly productSearch: string;
    readonly setProductSearch: (v: string) => void;
    readonly productCategory: string;
    readonly setProductCategory: (v: string) => void;
    readonly onSave: () => void;
    readonly saving: boolean;
    readonly canEdit: boolean;
    readonly onImageUpload: (file: File, setUrl: (url: string) => void, setUploading: (v: boolean) => void) => Promise<void>;
}

interface EditRewardFormProps extends FormComponentProps {
    readonly onCancel: () => void;
}

function AddRewardForm({ form, setForm, products, productSearch, setProductSearch, productCategory, setProductCategory, onSave, saving, canEdit, onImageUpload }: FormComponentProps) {
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="px-6 py-5 border-b border-border bg-muted/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="addRewardName" className={labelCls}>ชื่อรางวัล *</label>
                    <input id="addRewardName" value={form.rewardName} onChange={e => setForm((f: any) => ({ ...f, rewardName: e.target.value }))} placeholder="จำเป็น" className={inputCls} disabled={!canEdit} />
                </div>
                <div>
                    <label htmlFor="addProbability" className={labelCls}>โอกาสได้รับ (%) *</label>
                    <input id="addProbability" type="number" value={form.probability} onChange={e => setForm((f: any) => ({ ...f, probability: e.target.value }))} placeholder="รวมโอกาสของรางวัลทั้งหมดต้องไม่เกิน 100%" min={0.01} max={100} step={0.01} className={inputCls} disabled={!canEdit} />
                </div>
                <div>
                    <label htmlFor="addRewardType" className={labelCls}>ประเภทรางวัล *</label>
                    <select id="addRewardType" value={form.rewardType} onChange={e => setForm((f: any) => ({ ...f, rewardType: e.target.value, productId: "", rewardAmount: "" }))} className={inputCls} disabled={!canEdit}>
                        <option value="POINT">พอยต์</option>
                        <option value="CREDIT">เครดิต</option>
                        <option value="PRODUCT">สินค้าในเว็บ</option>
                    </select>
                </div>
                {form.rewardType === "PRODUCT" ? (
                    <div className="md:col-span-1">
                        <label htmlFor="addProductCategory" className={labelCls}>เลือกสินค้า *</label>
                        <select id="addProductCategory" value={productCategory} onChange={e => { setProductCategory(e.target.value); setProductSearch(""); setForm((f: any) => ({ ...f, productId: "", rewardName: "" })); }} className={inputCls + " mb-2"} disabled={!canEdit}>
                            <option value="">- เลือกหมวดหมู่ -</option>
                            {[...new Set(products.map(p => p.category))].sort((a, b) => a.localeCompare(b)).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <div className="relative">
                            <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="ค้นหาชื่อสินค้า..." className={inputCls} disabled={!canEdit} />
                            {canEdit && <ProductPickerDropdown products={products} search={productSearch} category={productCategory} onSelect={(p) => { setForm((f: any) => ({ ...f, productId: p.id, rewardName: p.name })); setProductSearch(""); setProductCategory(""); }} />}
                        </div>
                        {form.productId && <p className="mt-1 text-xs text-[#145de7] font-medium">เลือก: {form.rewardName}</p>}
                    </div>
                ) : (
                    <div>
                        <label htmlFor="addRewardAmount" className={labelCls}>จำนวนที่จะได้รับ *</label>
                        <input id="addRewardAmount" type="number" value={form.rewardAmount} onChange={e => setForm((f: any) => ({ ...f, rewardAmount: e.target.value }))} placeholder="เช่น 100" min={0} className={inputCls} disabled={!canEdit} />
                    </div>
                )}
                <div>
                    <label htmlFor="addRewardTier" className={labelCls}>ระดับรางวัล *</label>
                    <select id="addRewardTier" value={form.tier} onChange={e => setForm((f: any) => ({ ...f, tier: e.target.value }))} className={inputCls} disabled={!canEdit}>
                        {TIER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="mt-4">
                <label htmlFor="addRewardImageFile" className={labelCls}>รูปภาพรางวัล</label>
                <p className="text-xs text-muted-foreground mb-2">อัปโหลดรูป หรือวาง URL — รองรับ JPG, PNG, WebP, GIF ระบบจะครอปตรงกลางและย่ออัตโนมัติให้พอดีกับวงกลมรางวัลก่อนอัปโหลด</p>
                <input id="addRewardImageFile" ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={!canEdit} onChange={e => { const file = e.target.files?.[0]; if (file) { void onImageUpload(file, (url) => setForm((f: any) => ({ ...f, rewardImageUrl: url })), setUploadingImage); } e.target.value = ""; }} />
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!canEdit} className={`w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center flex-shrink-0 overflow-hidden transition-colors ${canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-50"} ${isDragging ? "border-[#145de7] bg-[#145de7]/10" : "border-border bg-muted/20"}`} onDragOver={(e) => { if (!canEdit) return; e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { if (!canEdit) return; e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) void onImageUpload(file, (url) => setForm((f: any) => ({ ...f, rewardImageUrl: url })), setUploadingImage); }}>
                        {validImageUrl(String(form.rewardImageUrl)) ? <Image src={String(form.rewardImageUrl)} alt="preview" width={48} height={48} className="w-full h-full object-cover pointer-events-none" /> : <ImageIcon className={`w-5 h-5 ${isDragging ? "text-[#145de7]" : "text-muted-foreground/40"}`} />}
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!canEdit || uploadingImage} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-muted/50 text-xs font-medium transition disabled:opacity-50 flex-shrink-0">
                        {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} {uploadingImage ? "กำลังอัปโหลด..." : "อัปโหลด"}
                    </button>
                    <input value={String(form.rewardImageUrl)} onChange={e => setForm((f: any) => ({ ...f, rewardImageUrl: e.target.value }))} placeholder="หรือวาง URL รูปภาพ" className={inputCls} disabled={!canEdit} />
                    {form.rewardImageUrl && <button type="button" onClick={() => setForm((f: any) => ({ ...f, rewardImageUrl: "" }))} disabled={!canEdit} className="text-red-400 hover:text-red-600 transition flex-shrink-0 disabled:opacity-50"><X className="w-4 h-4" /></button>}
                </div>
            </div>
            <button onClick={onSave} disabled={!canEdit || saving} className="mt-4 w-full py-3 rounded-xl bg-[#145de7] hover:bg-[#1048b8] text-white font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} เพิ่มรางวัล
            </button>
        </div>
    );
}

function EditRewardForm({ form, setForm, products, productSearch, setProductSearch, productCategory, setProductCategory, onSave, saving, canEdit, onImageUpload, onCancel }: EditRewardFormProps) {
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="border-b border-border bg-blue-50/60 dark:bg-blue-950/20 px-6 py-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[#145de7]">แก้ไขรางวัล</h3>
                <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label htmlFor="editRewardName" className={labelCls}>ชื่อรางวัล *</label><input id="editRewardName" value={form.rewardName} onChange={e => setForm((f: any) => ({ ...f, rewardName: e.target.value }))} placeholder="จำเป็น" className={inputCls} disabled={!canEdit} /></div>
                <div><label htmlFor="editProbability" className={labelCls}>โอกาสได้รับ (%) *</label><input id="editProbability" type="number" value={form.probability} onChange={e => setForm((f: any) => ({ ...f, probability: Number(e.target.value) }))} placeholder="รวมโอกาสของรางวัลทั้งหมดต้องไม่เกิน 100%" min={0.01} max={100} step={0.01} className={inputCls} disabled={!canEdit} /></div>
                <div><label htmlFor="editRewardType" className={labelCls}>ประเภทรางวัล *</label><select id="editRewardType" value={form.rewardType ?? "POINT"} onChange={e => setForm((f: any) => ({ ...f, rewardType: e.target.value, productId: "", rewardAmount: 0 }))} className={inputCls} disabled={!canEdit}><option value="POINT">พอยต์</option><option value="CREDIT">เครดิต</option><option value="PRODUCT">สินค้าในเว็บ</option></select></div>
                {form.rewardType === "PRODUCT" ? (
                    <div>
                        <label htmlFor="editProductCategory" className={labelCls}>เลือกสินค้า *</label>
                        <select id="editProductCategory" value={productCategory} onChange={e => { setProductCategory(e.target.value); setProductSearch(""); setForm((f: any) => ({ ...f, productId: "", rewardName: "" })); }} className={inputCls + " mb-2"} disabled={!canEdit}>
                            <option value="">- เลือกหมวดหมู่ -</option>
                            {[...new Set(products.map(p => p.category))].sort((a, b) => a.localeCompare(b)).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <div className="relative">
                            <input id="editProductSearch" value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="ค้นหาชื่อสินค้า..." className={inputCls} disabled={!canEdit} />
                            {canEdit && <ProductPickerDropdown products={products} search={productSearch} category={productCategory} onSelect={(p) => { setForm((f: any) => ({ ...f, productId: p.id, rewardName: p.name })); setProductSearch(""); setProductCategory(""); }} />}
                        </div>
                        {form.productId && <p className="mt-1 text-xs text-[#145de7] font-medium">เลือก: {form.rewardName}</p>}
                    </div>
                ) : (
                    <div><label htmlFor="editRewardAmount" className={labelCls}>จำนวนที่จะได้รับ *</label><input id="editRewardAmount" type="number" value={form.rewardAmount} onChange={e => setForm((f: any) => ({ ...f, rewardAmount: Number(e.target.value) }))} placeholder="เช่น 100" min={0} className={inputCls} disabled={!canEdit} /></div>
                )}
                <div><label htmlFor="editRewardTier" className={labelCls}>ระดับรางวัล *</label><select id="editRewardTier" value={form.tier} onChange={e => setForm((f: any) => ({ ...f, tier: e.target.value }))} className={inputCls} disabled={!canEdit}>{TIER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                <div className="md:col-span-2 mt-4">
                    <label htmlFor="editRewardImageFile" className={labelCls}>รูปภาพรางวัล</label>
                    <p className="text-xs text-muted-foreground mb-2">อัปโหลดรูป หรือวาง URL — รองรับ JPG, PNG, WebP, GIF ระบบจะครอปตรงกลางและย่ออัตโนมัติให้พอดีกับวงกลมรางวัลก่อนอัปโหลด</p>
                    <input id="editRewardImageFile" ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={!canEdit} onChange={e => { const file = e.target.files?.[0]; if (file) { void onImageUpload(file, (url) => setForm((f: any) => ({ ...f, rewardImageUrl: url })), setUploadingImage); } e.target.value = ""; }} />
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!canEdit} className={`w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center flex-shrink-0 overflow-hidden transition-colors ${canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-50"} ${isDragging ? "border-[#145de7] bg-[#145de7]/10" : "border-border bg-muted/20"}`} onDragOver={(e) => { if (!canEdit) return; e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { if (!canEdit) return; e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) void onImageUpload(file, (url) => setForm((f: any) => ({ ...f, rewardImageUrl: url })), setUploadingImage); }}>
                            {validImageUrl(form.rewardImageUrl) ? <Image src={form.rewardImageUrl} alt="preview" width={48} height={48} className="w-full h-full object-cover pointer-events-none" /> : <ImageIcon className={`w-5 h-5 ${isDragging ? "text-[#145de7]" : "text-muted-foreground/40"}`} />}
                        </button>
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!canEdit || uploadingImage} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-muted/50 text-xs font-medium transition disabled:opacity-50 flex-shrink-0">
                            {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} {uploadingImage ? "กำลังอัปโหลด..." : "อัปโหลด"}
                        </button>
                        <input value={form.rewardImageUrl} onChange={e => setForm((f: any) => ({ ...f, rewardImageUrl: e.target.value }))} placeholder="หรือวาง URL รูปภาพ" className={inputCls} disabled={!canEdit} />
                        {form.rewardImageUrl && <button type="button" onClick={() => setForm((f: any) => ({ ...f, rewardImageUrl: "" }))} disabled={!canEdit} className="text-red-400 hover:text-red-600 transition flex-shrink-0 disabled:opacity-50"><X className="w-4 h-4" /></button>}
                    </div>
                </div>
            </div>
            <button onClick={onSave} disabled={!canEdit || saving} className="mt-4 w-full py-3 rounded-xl bg-[#145de7] hover:bg-[#1048b8] text-white font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} บันทึกรางวัล
            </button>
        </div>
    );
}

export default function EditGachaMachinePage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const permissions = useAdminPermissions();
    const canEditGacha = permissions.includes(PERMISSIONS.GACHA_EDIT);
    const cropUrlRef = useRef<string | null>(null);
    const pendingUploadRef = useRef<{
        setUrl: (url: string) => void;
        setUploading: (v: boolean) => void;
    } | null>(null);

    const [machineName, setMachineName] = useState("");
    const [loading, setLoading] = useState(true);

    // rewards
    const [rewards, setRewards] = useState<GachaReward[]>([]);
    const [rewardsLoading, setRewardsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [rewardPerPage, setRewardPerPage] = useState(10);
    const [rewardPage, setRewardPage] = useState(1);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [simulating, setSimulating] = useState(false);
    const [simulationResults, setSimulationResults] = useState<SimulationRow[] | null>(null);
    const [simulationRounds, setSimulationRounds] = useState<number>(SIMULATION_RUNS);

    // add reward form
    const [addForm, setAddForm] = useState(defaultAddForm);
    const [addSaving, setAddSaving] = useState(false);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [cropFileName, setCropFileName] = useState("");

    // edit reward modal
    const [editReward, setEditReward] = useState<GachaReward | null>(null);
    const [editSaving, setEditSaving] = useState(false);
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

    // Add reward
    const handleAddReward = async () => {
        if (!canEditGacha) {
            showError("คุณไม่มีสิทธิ์แก้ไขตู้กาชา");
            return;
        }

        const error = validateReward(addForm, rewards);
        if (error) return showError(error);
        
        const prob = Number(addForm.probability);
        setAddSaving(true);
        try {
            const body = buildRewardPayload({ ...addForm, probability: prob }, id);
            const res = await fetch("/api/admin/gacha-rewards", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
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

    const clearCropDialog = useCallback(() => {
        if (cropUrlRef.current) {
            URL.revokeObjectURL(cropUrlRef.current);
            cropUrlRef.current = null;
        }
        pendingUploadRef.current = null;
        setCropDialogOpen(false);
        setCropImageSrc(null);
        setCropFileName("");
    }, []);

    const uploadRewardImage = useCallback(async (
        file: File,
        setUrl: (url: string) => void,
        setUploading: (v: boolean) => void
    ) => {
        if (!canEditGacha) {
            showError("คุณไม่มีสิทธิ์แก้ไขตู้กาชา");
            return;
        }

        setUploading(true);
        try {
            const keepsOriginalFrames = file.type === "image/gif" || file.type === "image/svg+xml";
            const croppedFile = keepsOriginalFrames
                ? file
                : await resizeFileToSquare(file, 512, 0.92);
            const preparedFile = await compressImage(croppedFile, 4.5 * 1024 * 1024);
            const formData = new FormData();
            formData.append("file", preparedFile);
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
    }, [canEditGacha]);

    // Upload image (shared)
    const handleImageUpload = async (
        file: File,
        setUrl: (url: string) => void,
        setUploading: (v: boolean) => void
    ) => {
        if (!canEditGacha) {
            showError("คุณไม่มีสิทธิ์แก้ไขตู้กาชา");
            return;
        }

        if (file.type === "image/gif" || file.type === "image/svg+xml") {
            await uploadRewardImage(file, setUrl, setUploading);
            return;
        }

        if (cropUrlRef.current) {
            URL.revokeObjectURL(cropUrlRef.current);
        }

        const objectUrl = URL.createObjectURL(file);
        cropUrlRef.current = objectUrl;
        pendingUploadRef.current = { setUrl, setUploading };
        setCropFileName(file.name);
        setCropImageSrc(objectUrl);
        setCropDialogOpen(true);
    };

    const handleCropConfirm = useCallback(async (croppedFile: File) => {
        if (!canEditGacha) {
            showError("คุณไม่มีสิทธิ์แก้ไขตู้กาชา");
            clearCropDialog();
            return;
        }

        const pendingUpload = pendingUploadRef.current;
        if (!pendingUpload) {
            clearCropDialog();
            return;
        }

        await uploadRewardImage(croppedFile, pendingUpload.setUrl, pendingUpload.setUploading);
        clearCropDialog();
    }, [canEditGacha, clearCropDialog, uploadRewardImage]);

    // Delete reward
    const handleDeleteReward = async (rewardId: string) => {
        if (!canEditGacha) {
            showError("คุณไม่มีสิทธิ์ลบรางวัลกาชา");
            return;
        }

        if (!await showDeleteConfirm("รางวัลนี้")) return;
        setDeletingId(rewardId);
        try {
            await fetch(`/api/admin/gacha-rewards/${rewardId}`, { method: "DELETE" });
            void loadRewards();
        } finally { setDeletingId(null); }
    };

    // Edit reward
    const openEdit = (r: GachaReward) => {
        if (!canEditGacha) {
            showError("คุณไม่มีสิทธิ์แก้ไขตู้กาชา");
            return;
        }

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
        if (!canEditGacha) {
            showError("คุณไม่มีสิทธิ์แก้ไขตู้กาชา");
            return;
        }

        if (!editReward) return;
        const error = validateReward(editForm, rewards, editReward.id);
        if (error) return showError(error);
        
        setEditSaving(true);
        const body = buildRewardPayload(editForm);
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

    const handleSimulate = async () => {
        const eligibleRewards = rewards.filter(isRewardEligibleForSimulation);

        if (eligibleRewards.length === 0) {
            showError("ไม่มีรางวัลที่พร้อมสำหรับการจำลอง");
            return;
        }

        setSimulating(true);
        try {
            const rounds = SIMULATION_RUNS;
            const weights = eligibleRewards.map((reward) => Math.max(0, Number(reward.probability ?? 0)));
            const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

            if (totalWeight <= 0) {
                showError("โอกาสรวมต้องมากกว่า 0 ก่อนจำลอง");
                return;
            }

            const counts = new Map<string, number>();
            for (const reward of eligibleRewards) {
                counts.set(reward.id, 0);
            }

            for (let round = 0; round < rounds; round += 1) {
                let cursor = Math.random() * totalWeight;
                for (let index = 0; index < eligibleRewards.length; index += 1) {
                    cursor -= weights[index] ?? 0;
                    if (cursor < 0) {
                        const rewardId = eligibleRewards[index].id;
                        counts.set(rewardId, (counts.get(rewardId) ?? 0) + 1);
                        break;
                    }
                }
            }

            const rows = eligibleRewards.map((reward) => ({
                id: reward.id,
                name: getSimulationRewardName(reward),
                configuredProbability: Number(reward.probability ?? 0),
                simulatedCount: counts.get(reward.id) ?? 0,
                simulatedRate: Number((((counts.get(reward.id) ?? 0) / rounds) * 100).toFixed(2)),
            })).sort((a, b) => b.configuredProbability - a.configuredProbability);

            setSimulationRounds(rounds);
            setSimulationResults(rows);
        } finally {
            setSimulating(false);
        }
    };

    // Pagination and sorting
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

    const sortedRewards = sortRewards(filteredRewards, sortField, sortAsc, getRewardName);

    const totalRewardPages = Math.max(1, Math.ceil(sortedRewards.length / rewardPerPage));
    const paginatedRewards = sortedRewards.slice((rewardPage - 1) * rewardPerPage, rewardPage * rewardPerPage);

    // Total probability used
    const totalUsed = Math.round(rewards.reduce((sum, r) => sum + Number(r.probability ?? 0), 0) * 100) / 100;
    const remaining = Math.max(0, Math.round((100 - totalUsed) * 100) / 100);

    let totalUsedColorText = "text-emerald-500";
    let totalUsedColorBg = "bg-emerald-500";
    if (totalUsed >= 100) {
        totalUsedColorText = "text-red-500";
        totalUsedColorBg = "bg-red-500";
    } else if (totalUsed >= 80) {
        totalUsedColorText = "text-amber-500";
        totalUsedColorBg = "bg-amber-400";
    }

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

            {/* จัดการรางวัล */}
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
                        <span className={`text-xs font-bold ${totalUsedColorText}`}>
                            {totalUsed}% / 100%
                        </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${totalUsedColorBg}`}
                            style={{ width: `${Math.min(100, totalUsed)}%` }}
                        />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                        {totalUsed >= 100
                            ? "ไม่สามารถเพิ่มรางวัลได้อีก (ใช้ครบ 100%)"
                            : `เหลือโอกาส ${remaining}% สำหรับรางวัลเพิ่มเติม`}
                    </p>
                    <div className="mt-4 rounded-xl border border-[#d9e5ff] bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-[#145de7]">ผลจำลองอัตราสุ่ม</h3>
                                <p className="text-[11px] text-muted-foreground">
                                    ใช้ค่า probability ปัจจุบันของรางวัลในตู้ใบนี้เพื่อจำลอง {SIMULATION_RUNS.toLocaleString()} ครั้ง
                                </p>
                            </div>
                            <button
                                onClick={() => void handleSimulate()}
                                disabled={simulating || rewards.length === 0}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#145de7]/20 bg-[#eef4ff] px-4 py-2.5 text-xs font-bold text-[#145de7] transition hover:bg-[#dfeaff] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {simulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
                                จำลอง {SIMULATION_RUNS.toLocaleString()} ครั้ง
                            </button>
                        </div>

                        {simulationResults ? (
                            <>
                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                                        <p className="text-[11px] text-muted-foreground">จำนวนรางวัลที่นำมาคิด</p>
                                        <p className="mt-1 text-sm font-bold text-foreground">{simulationResults.length.toLocaleString()} รายการ</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                                        <p className="text-[11px] text-muted-foreground">รอบจำลองล่าสุด</p>
                                        <p className="mt-1 text-sm font-bold text-foreground">{simulationRounds.toLocaleString()} ครั้ง</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                                        <p className="text-[11px] text-muted-foreground">เปอร์เซ็นต์รวมของรางวัลที่ใช้จริง</p>
                                        <p className="mt-1 text-sm font-bold text-foreground">
                                            {simulationResults.reduce((sum, row) => sum + row.configuredProbability, 0).toFixed(2)}%
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 overflow-hidden rounded-xl border border-[#d9e5ff] bg-white">
                                    <div className="overflow-x-auto">
                                        <div className="min-w-[420px]">
                                            <div className="grid grid-cols-[minmax(0,1.5fr)_90px_90px_90px] gap-2 border-b border-border bg-[#f7faff] px-3 py-2 text-[11px] font-bold text-[#145de7]">
                                                <span>รางวัล</span>
                                                <span className="text-right">ตั้งไว้</span>
                                                <span className="text-right">สุ่มได้</span>
                                                <span className="text-right">จำนวน</span>
                                            </div>
                                            {simulationResults.map((row) => (
                                                <div key={row.id} className="grid grid-cols-[minmax(0,1.5fr)_90px_90px_90px] gap-2 border-b border-border/60 px-3 py-2 text-[12px] last:border-b-0">
                                                    <span className="truncate font-medium text-foreground">{row.name}</span>
                                                    <span className="text-right text-muted-foreground">{row.configuredProbability}%</span>
                                                    <span className="text-right font-semibold text-[#145de7]">{row.simulatedRate}%</span>
                                                    <span className="text-right text-muted-foreground">{row.simulatedCount.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="mt-3 rounded-lg border border-dashed border-[#cbdcff] bg-[#f7faff] px-3 py-4 text-xs text-muted-foreground">
                                กดปุ่มจำลองเพื่อดูว่าค่าเปอร์เซ็นต์ที่ตั้งไว้ตอนนี้ออกจริงประมาณไหนเมื่อสุ่ม {SIMULATION_RUNS.toLocaleString()} ครั้ง
                            </div>
                        )}
                    </div>
                </div>

                <AddRewardForm
                    form={addForm}
                    setForm={setAddForm}
                    products={products}
                    productSearch={productSearch}
                    setProductSearch={setProductSearch}
                    productCategory={productCategory}
                    setProductCategory={setProductCategory}
                    onSave={() => void handleAddReward()}
                    saving={addSaving}
                    canEdit={canEditGacha}
                    onImageUpload={handleImageUpload}
                />

                {/* Edit reward inline form */}
                {editReward && (
                    <EditRewardForm
                        form={editForm}
                        setForm={setEditForm as any}
                        products={products}
                        productSearch={editProductSearch}
                        setProductSearch={setEditProductSearch}
                        productCategory={editProductCategory}
                        setProductCategory={setEditProductCategory}
                        onSave={() => void handleEditSave()}
                        saving={editSaving}
                        canEdit={canEditGacha}
                        onImageUpload={handleImageUpload}
                        onCancel={closeEdit}
                    />
                )}

                {/* Toolbar */}
                <div className="px-4 py-3 border-b border-border flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>แสดง</span>
                        <select value={rewardPerPage} onChange={e => { setRewardPerPage(Number(e.target.value)); setRewardPage(1); }} className="border border-border rounded px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#145de7]">
                            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <span>ลำดับ</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>ค้นหา</span>
                        <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setRewardPage(1); }} placeholder="" className="border border-border rounded px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#145de7] w-full sm:w-40" />
                    </div>
                </div>

                {/* Table */}
                <div className="space-y-3 px-4 py-4 md:hidden">
                    {rewardsLoading && (
                        <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" /></div>
                    )}
                    {!rewardsLoading && paginatedRewards.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground text-sm">ไม่พบรายการ</div>
                    )}
                    {!rewardsLoading && paginatedRewards.length > 0 && paginatedRewards.map((r, i) => {
                        const imgUrl = r.rewardType === "PRODUCT" ? r.product?.imageUrl : r.rewardImageUrl;
                        const name = r.rewardType === "PRODUCT" ? (r.product?.name ?? "—") : (r.rewardName ?? "—");
                        const isBeingEdited = editReward?.id === r.id;
                        return (
                            <div key={r.id} className={`rounded-xl border border-border p-4 ${isBeingEdited ? "bg-violet-50/60 dark:bg-violet-950/20" : ""}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        {validImageUrl(imgUrl) ? (
                                            <Image src={imgUrl!} alt={name} width={36} height={36} className="w-10 h-10 rounded-full object-cover flex-shrink-0" unoptimized />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
                                                <LayoutGrid className="w-4 h-4 text-[#145de7]/40" />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="font-medium text-foreground truncate">{name}</p>
                                            <p className="text-xs text-muted-foreground">ลำดับ {(rewardPage - 1) * rewardPerPage + i + 1}</p>
                                        </div>
                                    </div>
                                    <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${TIER_COLORS[r.tier] ?? TIER_COLORS.common}`}>
                                        {TIER_OPTIONS.find(t => t.value === r.tier)?.label ?? r.tier}
                                    </span>
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                                    <span className="text-muted-foreground">โอกาสได้รับ</span>
                                    <span className="font-medium text-foreground">{r.probability}%</span>
                                </div>
                                <div className="mt-4 flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => openEdit(r)}
                                        disabled={!canEditGacha}
                                        className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10 dark:hover:text-violet-400 flex items-center justify-center transition"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => void handleDeleteReward(r.id)}
                                        disabled={!canEditGacha}
                                        className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 flex items-center justify-center transition"
                                    >
                                        {deletingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[760px] text-sm">
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
                                    <div className="flex items-center gap-1">ระดับ {sortField === "tier" && (sortAsc ? "↑" : "↓")}</div>
                                </th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">แก้ไข</th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">ลบ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rewardsLoading && (
                                <tr><td colSpan={7} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" /></td></tr>
                            )}
                            {!rewardsLoading && paginatedRewards.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">ไม่พบรายการ</td></tr>
                            )}
                            {!rewardsLoading && paginatedRewards.length > 0 && paginatedRewards.map((r, i) => {
                                const imgUrl = r.rewardType === "PRODUCT" ? r.product?.imageUrl : r.rewardImageUrl;
                                const name = r.rewardType === "PRODUCT" ? (r.product?.name ?? "—") : (r.rewardName ?? "—");
                                const isBeingEdited = editReward?.id === r.id;
                                return (
                                    <tr key={r.id} className={`border-b border-border/40 transition-colors ${isBeingEdited ? "bg-violet-50/60 dark:bg-violet-950/20" : "hover:bg-muted/30"}`}>
                                        <td className="px-3 py-2.5 text-muted-foreground">{(rewardPage - 1) * rewardPerPage + i + 1}</td>
                                        <td className="px-3 py-2.5">
                                            {validImageUrl(imgUrl) ? (
                                                <Image src={imgUrl!} alt={name} width={36} height={36} className="w-9 h-9 rounded-full object-cover" unoptimized />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-[#eff6ff] flex items-center justify-center">
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
                                                disabled={!canEditGacha}
                                                className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10 dark:hover:text-violet-400 flex items-center justify-center transition"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <button
                                                onClick={() => void handleDeleteReward(r.id)}
                                                disabled={!canEditGacha}
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

            <RewardImageCropDialog
                open={cropDialogOpen}
                imageSrc={cropImageSrc}
                fileName={cropFileName}
                onClose={clearCropDialog}
                onConfirm={handleCropConfirm}
            />
        </div>
    );
}





