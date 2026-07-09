"use client";

import { SpinnerScreen } from "@/components/SpinnerScreen";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ChevronLeft,
    ChevronRight,
    Copy,
    Loader2,
    Pencil,
    Plus,
    Search,
    Ticket,
    Trash2,
} from "lucide-react";
import { showDeleteConfirm, showError, showSuccess } from "@/lib/swal";
import { cn } from "@/lib/utils";
import { PERMISSIONS } from "@/lib/permissions";

interface PromoCode {
    id: string;
    code: string;
    codeType: string;
    discountType: string;
    discountValue: number;
    minPurchase: number | null;
    maxDiscount: number | null;
    usageLimit: number | null;
    usagePerUser: number | null;
    usedCount: number;
    startsAt: string;
    expiresAt: string | null;
    isActive: boolean;
    createdAt: string;
}

type PromoFormState = {
    code: string;
    codeType: string;
    discountType: string;
    discountValue: string;
    minPurchase: string;
    maxDiscount: string;
    usageLimit: string;
    usagePerUser: string;
    startsAt: string;
    expiresAt: string;
    isActive: boolean;
};

const initialFormData: PromoFormState = {
    code: "",
    codeType: "DISCOUNT",
    discountType: "PERCENTAGE",
    discountValue: "",
    minPurchase: "",
    maxDiscount: "",
    usageLimit: "",
    usagePerUser: "",
    startsAt: "",
    expiresAt: "",
    isActive: true,
};

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50] as const;

type PromoStatus = "active" | "scheduled" | "inactive" | "expired" | "depleted";

type PromoFilter = "all" | "active" | "inactive" | "expired" | "depleted" | "DISCOUNT" | "CREDIT";

const FILTER_OPTIONS: { value: PromoFilter; label: string }[] = [
    { value: "all", label: "ทั้งหมด" },
    { value: "active", label: "ใช้งานอยู่" },
    { value: "inactive", label: "ปิดอยู่" },
    { value: "expired", label: "หมดอายุ" },
    { value: "depleted", label: "ใช้ครบแล้ว" },
    { value: "DISCOUNT", label: "โค้ดส่วนลด" },
    { value: "CREDIT", label: "โค้ดเครดิต" },
];

// Drizzle datetime (mode string) arrives as UTC "YYYY-MM-DD HH:MM:SS" — no "T",
// no zone marker — which Safari refuses to parse and Chrome misreads as local time.
function parsePromoDate(value: string | null): Date | null {
    if (!value) return null;

    const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
    const parsed = new Date(normalized);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toBangkokDateInputValue(value: string | null): string {
    const date = parsePromoDate(value);
    if (!date) return "";

    // en-CA gives YYYY-MM-DD, the format <input type="date"> requires
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

function isExpired(expiresAt: string | null): boolean {
    const date = parsePromoDate(expiresAt);
    return date !== null && date < new Date();
}

function isNotStarted(startsAt: string | null): boolean {
    const date = parsePromoDate(startsAt);
    return date !== null && date > new Date();
}

function getPromoStatus(code: PromoCode): PromoStatus {
    if (isExpired(code.expiresAt)) return "expired";
    if (!code.isActive) return "inactive";
    if (code.usageLimit && code.usedCount >= code.usageLimit) return "depleted";
    if (isNotStarted(code.startsAt)) return "scheduled";
    return "active";
}

const STATUS_META: Record<PromoStatus, { label: string; className: string }> = {
    active: {
        label: "ใช้งานอยู่",
        className:
            "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/15",
    },
    scheduled: {
        label: "รอเริ่มใช้",
        className:
            "bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-500/15 dark:text-sky-300 dark:hover:bg-sky-500/15",
    },
    inactive: {
        label: "ปิดอยู่",
        className: "bg-muted text-muted-foreground hover:bg-muted",
    },
    expired: {
        label: "หมดอายุ",
        className:
            "bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/15",
    },
    depleted: {
        label: "ใช้ครบแล้ว",
        className:
            "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/15",
    },
};

function StatusBadge({ status }: Readonly<{ status: PromoStatus }>) {
    const meta = STATUS_META[status];

    return (
        <Badge className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", meta.className)}>
            {meta.label}
        </Badge>
    );
}

function getCodeTypeBadgeClass(codeType: string) {
    return codeType === "CREDIT"
        ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300"
        : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300";
}

function getCodeTypeLabel(codeType: string) {
    return codeType === "CREDIT" ? "โค้ดเติมเครดิต" : "โค้ดส่วนลด";
}

function formatDiscount(code: PromoCode) {
    if (code.codeType === "CREDIT") {
        return `เครดิต ฿${code.discountValue.toLocaleString()}`;
    }

    if (code.discountType === "PERCENTAGE") {
        return `${code.discountValue}%`;
    }

    return `฿${code.discountValue.toLocaleString()}`;
}

function formatThaiDate(value: string | null) {
    const date = parsePromoDate(value);
    if (!date) return null;

    return date.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" });
}

function formatExpireDate(expiresAt: string | null) {
    return formatThaiDate(expiresAt) ?? "ไม่หมดอายุ";
}

function UsageDisplay({ used, limit }: Readonly<{ used: number; limit: number | null }>) {
    if (!limit) {
        return (
            <p className="text-sm">
                <span className="font-medium">{used.toLocaleString()}</span>
                <span className="text-muted-foreground"> ครั้ง</span>
            </p>
        );
    }

    const percent = Math.min(100, Math.round((used / limit) * 100));

    let barClass = "bg-blue-500";
    if (percent >= 100) {
        barClass = "bg-rose-500";
    } else if (percent >= 80) {
        barClass = "bg-amber-500";
    }

    return (
        <div className="space-y-1">
            <p className="text-sm">
                <span className="font-medium">{used.toLocaleString()}</span>
                <span className="text-muted-foreground">/{limit.toLocaleString()}</span>
            </p>
            <div className="h-1.5 w-24 max-w-full overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full transition-all", barClass)} style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}

function PromoConditionLines({ code }: Readonly<{ code: PromoCode }>) {
    const lines: string[] = [];

    if (code.codeType === "DISCOUNT" && code.minPurchase) {
        lines.push(`ขั้นต่ำ ฿${code.minPurchase.toLocaleString()}`);
    }

    if (code.usagePerUser) {
        lines.push(`คนละไม่เกิน ${code.usagePerUser.toLocaleString()} ครั้ง`);
    }

    const startDate = isNotStarted(code.startsAt) ? formatThaiDate(code.startsAt) : null;
    if (startDate) {
        lines.push(`เริ่มใช้ ${startDate}`);
    }

    if (lines.length === 0) return null;

    return (
        <p className="text-xs text-muted-foreground">{lines.join(" · ")}</p>
    );
}

export default function AdminPromoCodesPage() {
    const permissions = useAdminPermissions();
    const canEditPromo = permissions.includes(PERMISSIONS.PROMO_EDIT);
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<PromoFormState>(initialFormData);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState<PromoFilter>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(10);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const fetchPromoCodes = useCallback(async () => {
        try {
            const response = await fetch("/api/admin/promo-codes");
            const data = await response.json();

            if (data.success) {
                setPromoCodes(data.data);
            } else {
                showError(data.message || "ไม่สามารถโหลดข้อมูลโค้ดโปรโมชั่นได้");
            }
        } catch (error) {
            console.error("[PROMO_CODE_FETCH]", error);
            showError("ไม่สามารถโหลดข้อมูลโค้ดโปรโมชั่นได้");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPromoCodes();
    }, [fetchPromoCodes]);

    const matchesFilter = useCallback((code: PromoCode, filter: PromoFilter) => {
        if (filter === "all") return true;
        if (filter === "DISCOUNT" || filter === "CREDIT") return code.codeType === filter;

        const status = getPromoStatus(code);
        if (filter === "active") return status === "active" || status === "scheduled";
        return status === filter;
    }, []);

    const filteredCodes = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        return promoCodes.filter((code) => {
            const matchesSearch = !query || code.code.toLowerCase().includes(query);
            return matchesSearch && matchesFilter(code, activeFilter);
        });
    }, [promoCodes, searchTerm, activeFilter, matchesFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredCodes.length / itemsPerPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    const paginatedCodes = filteredCodes.slice(startIndex, startIndex + itemsPerPage);

    const resetForm = () => {
        setFormData(initialFormData);
        setEditingCode(null);
    };

    const handleOpenCreate = () => {
        if (!canEditPromo) {
            showError("คุณไม่มีสิทธิ์สร้างโค้ดโปรโมชั่น");
            return;
        }
        resetForm();
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (promoCode: PromoCode) => {
        if (!canEditPromo) {
            showError("คุณไม่มีสิทธิ์แก้ไขโค้ดโปรโมชั่น");
            return;
        }
        setEditingCode(promoCode);
        setFormData({
            code: promoCode.code,
            codeType: promoCode.codeType || "DISCOUNT",
            discountType: promoCode.discountType,
            discountValue: promoCode.discountValue.toString(),
            minPurchase: promoCode.minPurchase?.toString() || "",
            maxDiscount: promoCode.maxDiscount?.toString() || "",
            usageLimit: promoCode.usageLimit?.toString() || "",
            usagePerUser: promoCode.usagePerUser?.toString() || "",
            startsAt: toBangkokDateInputValue(promoCode.startsAt),
            expiresAt: toBangkokDateInputValue(promoCode.expiresAt),
            isActive: promoCode.isActive,
        });
        setIsDialogOpen(true);
    };

    const normalizeEndDateForApi = (value: string) =>
        value ? new Date(`${value}T23:59:59.000+07:00`).toISOString() : null;

    const normalizeStartDateForApi = (value: string) =>
        value ? new Date(`${value}T00:00:00.000+07:00`).toISOString() : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canEditPromo) {
            showError("คุณไม่มีสิทธิ์แก้ไขโค้ดโปรโมชั่น");
            return;
        }
        setIsSaving(true);

        try {
            const url = editingCode
                ? `/api/admin/promo-codes/${editingCode.id}`
                : "/api/admin/promo-codes";
            const method = editingCode ? "PUT" : "POST";

            const isDiscount = formData.codeType === "DISCOUNT";

            const payload = editingCode
                ? {
                    discountType: formData.discountType,
                    discountValue: formData.discountValue,
                    minPurchase: isDiscount && formData.minPurchase ? formData.minPurchase : null,
                    maxDiscount: isDiscount && formData.maxDiscount ? formData.maxDiscount : null,
                    usageLimit: formData.usageLimit || null,
                    usagePerUser: formData.usagePerUser || null,
                    startsAt: normalizeStartDateForApi(formData.startsAt),
                    expiresAt: normalizeEndDateForApi(formData.expiresAt),
                    isActive: formData.isActive,
                }
                : {
                    code: formData.code,
                    codeType: formData.codeType,
                    discountType: formData.discountType,
                    discountValue: formData.discountValue,
                    minOrderAmount: isDiscount ? formData.minPurchase || 0 : 0,
                    maxDiscount: isDiscount ? formData.maxDiscount || 0 : 0,
                    maxUses: formData.usageLimit || 0,
                    usagePerUser: formData.usagePerUser || 0,
                    startsAt: normalizeStartDateForApi(formData.startsAt),
                    expiresAt: normalizeEndDateForApi(formData.expiresAt),
                    applicableCategories: [],
                    excludedCategories: [],
                    isNewUserOnly: false,
                    isActive: formData.isActive,
                };

            const response = await fetchWithCsrf(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            if (data.success) {
                showSuccess(editingCode ? "แก้ไขโค้ดสำเร็จ" : "สร้างโค้ดสำเร็จ");
                setIsDialogOpen(false);
                resetForm();
                fetchPromoCodes();
                return;
            }

            showError(data.message || "เกิดข้อผิดพลาด");
        } catch (error) {
            console.error("[PROMO_CODE_SUBMIT]", error);
            showError("ไม่สามารถบันทึกข้อมูลได้");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!canEditPromo) {
            showError("คุณไม่มีสิทธิ์ลบโค้ดโปรโมชั่น");
            return;
        }
        const confirmed = await showDeleteConfirm("โค้ดนี้");
        if (!confirmed) return;

        try {
            const response = await fetchWithCsrf(`/api/admin/promo-codes/${id}`, {
                method: "DELETE",
            });
            const data = await response.json();

            if (data.success) {
                showSuccess("ลบโค้ดสำเร็จ");
                fetchPromoCodes();
                return;
            }

            showError(data.message || "ไม่สามารถลบโค้ดได้");
        } catch (error) {
            console.error("[PROMO_CODE_DELETE]", error);
            showError("เกิดข้อผิดพลาด");
        }
    };

    const handleToggleActive = async (promoCode: PromoCode) => {
        if (!canEditPromo) {
            showError("คุณไม่มีสิทธิ์เปลี่ยนสถานะโค้ดโปรโมชั่น");
            return;
        }

        const nextActive = !promoCode.isActive;

        setTogglingId(promoCode.id);
        setPromoCodes((current) =>
            current.map((code) =>
                code.id === promoCode.id ? { ...code, isActive: nextActive } : code
            )
        );

        try {
            const response = await fetchWithCsrf(`/api/admin/promo-codes/${promoCode.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: nextActive }),
            });
            const data = await response.json();

            if (data.success) {
                showSuccess(nextActive ? "เปิดใช้งานแล้ว" : "ปิดใช้งานแล้ว");
                fetchPromoCodes();
                return;
            }

            throw new Error(data.message || "ไม่สามารถเปลี่ยนสถานะได้");
        } catch (error) {
            console.error("[PROMO_CODE_TOGGLE]", error);
            setPromoCodes((current) =>
                current.map((code) =>
                    code.id === promoCode.id ? { ...code, isActive: promoCode.isActive } : code
                )
            );
            showError(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
        } finally {
            setTogglingId(null);
        }
    };

    const copyCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            showSuccess(`คัดลอก ${code} แล้ว`);
        } catch (error) {
            console.error("[PROMO_CODE_COPY]", error);
            showError("ไม่สามารถคัดลอกโค้ดได้");
        }
    };

    if (isLoading) {
        return <SpinnerScreen label="กำลังโหลดโค้ดส่วนลด..." />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
                        โค้ดโปรโมชั่น
                    </h1>
                    <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                        จัดการทั้งโค้ดส่วนลดและโค้ดเติมเครดิต พร้อมเปิดปิดการใช้งานได้จากหน้านี้
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <Button onClick={handleOpenCreate} className="w-full gap-2 sm:w-auto" disabled={!canEditPromo}>
                        <Plus className="h-4 w-4" />
                        สร้างโค้ดใหม่
                    </Button>

                    <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto p-4 sm:max-w-md sm:p-6">
                        <DialogHeader>
                            <DialogTitle>
                                {editingCode ? "แก้ไขโค้ดโปรโมชั่น" : "สร้างโค้ดโปรโมชั่นใหม่"}
                            </DialogTitle>
                            <DialogDescription>
                                เลือกประเภทโค้ด แล้วกำหนดรายละเอียดการใช้งานตามต้องการ
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="code">โค้ด</Label>
                                <Input
                                    id="code"
                                    placeholder="เช่น SALE50"
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData((current) => ({
                                            ...current,
                                            code: e.target.value.toUpperCase(),
                                        }))
                                    }
                                    disabled={!canEditPromo || Boolean(editingCode)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>ประเภทโค้ด</Label>
                                <Select
                                    value={formData.codeType}
                                    onValueChange={(value) =>
                                        setFormData((current) => ({
                                            ...current,
                                            codeType: value,
                                            discountType: value === "CREDIT" ? "FIXED" : current.discountType,
                                            minPurchase: value === "CREDIT" ? "" : current.minPurchase,
                                            maxDiscount: value === "CREDIT" ? "" : current.maxDiscount,
                                        }))
                                    }
                                >
                                    <SelectTrigger disabled={!canEditPromo || Boolean(editingCode)}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DISCOUNT">โค้ดส่วนลด</SelectItem>
                                        <SelectItem value="CREDIT">โค้ดเติมเครดิต</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {formData.codeType === "DISCOUNT" ? (
                                    <div className="space-y-2">
                                        <Label>ประเภทส่วนลด</Label>
                                        <Select
                                            value={formData.discountType}
                                            onValueChange={(value) =>
                                                setFormData((current) => ({
                                                    ...current,
                                                    discountType: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger disabled={!canEditPromo}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PERCENTAGE">เปอร์เซ็นต์ (%)</SelectItem>
                                                <SelectItem value="FIXED">จำนวนเงิน (฿)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label>ลักษณะการเติม</Label>
                                        <Input value="เติมเครดิตเข้าบัญชี" disabled />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="discountValue">
                                        {formData.codeType === "CREDIT"
                                            ? "จำนวนเครดิต"
                                            : formData.discountType === "PERCENTAGE"
                                                ? "เปอร์เซ็นต์"
                                                : "จำนวนเงิน"}
                                    </Label>
                                    <Input
                                        id="discountValue"
                                        type="number"
                                        placeholder={
                                            formData.codeType === "CREDIT"
                                                ? "100"
                                                : formData.discountType === "PERCENTAGE"
                                                    ? "10"
                                                    : "50"
                                        }
                                        value={formData.discountValue}
                                        onChange={(e) =>
                                            setFormData((current) => ({
                                                ...current,
                                                discountValue: e.target.value,
                                            }))
                                        }
                                        disabled={!canEditPromo}
                                        required
                                    />
                                </div>
                            </div>

                            {formData.codeType === "DISCOUNT" ? (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="minPurchase">ยอดขั้นต่ำ (฿)</Label>
                                        <Input
                                            id="minPurchase"
                                            type="number"
                                            placeholder="ไม่บังคับ"
                                            value={formData.minPurchase}
                                            onChange={(e) =>
                                                setFormData((current) => ({
                                                    ...current,
                                                    minPurchase: e.target.value,
                                                }))
                                            }
                                            disabled={!canEditPromo}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="maxDiscount">ส่วนลดสูงสุด (฿)</Label>
                                        <Input
                                            id="maxDiscount"
                                            type="number"
                                            placeholder="ไม่จำกัด"
                                            value={formData.maxDiscount}
                                            onChange={(e) =>
                                                setFormData((current) => ({
                                                    ...current,
                                                    maxDiscount: e.target.value,
                                                }))
                                            }
                                            disabled={!canEditPromo}
                                        />
                                    </div>
                                </div>
                            ) : null}

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="usageLimit">จำกัดการใช้รวม</Label>
                                    <Input
                                        id="usageLimit"
                                        type="number"
                                        placeholder="ไม่จำกัด"
                                        value={formData.usageLimit}
                                        onChange={(e) =>
                                            setFormData((current) => ({
                                                ...current,
                                                usageLimit: e.target.value,
                                            }))
                                        }
                                        disabled={!canEditPromo}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="usagePerUser">จำกัดต่อคน</Label>
                                    <Input
                                        id="usagePerUser"
                                        type="number"
                                        placeholder="ไม่จำกัด"
                                        value={formData.usagePerUser}
                                        onChange={(e) =>
                                            setFormData((current) => ({
                                                ...current,
                                                usagePerUser: e.target.value,
                                            }))
                                        }
                                        disabled={!canEditPromo}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="startsAt">เริ่มใช้ได้</Label>
                                    <Input
                                        id="startsAt"
                                        type="date"
                                        value={formData.startsAt}
                                        onChange={(e) =>
                                            setFormData((current) => ({
                                                ...current,
                                                startsAt: e.target.value,
                                            }))
                                        }
                                        disabled={!canEditPromo}
                                    />
                                    <p className="text-xs text-muted-foreground">เว้นว่าง = ใช้ได้ทันที</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="expiresAt">หมดอายุ</Label>
                                    <Input
                                        id="expiresAt"
                                        type="date"
                                        value={formData.expiresAt}
                                        onChange={(e) =>
                                            setFormData((current) => ({
                                                ...current,
                                                expiresAt: e.target.value,
                                            }))
                                        }
                                        disabled={!canEditPromo}
                                    />
                                    <p className="text-xs text-muted-foreground">เว้นว่าง = ไม่หมดอายุ</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 px-4 py-3">
                                <Label htmlFor="promo-active">เปิดใช้งาน</Label>
                                <Switch
                                    id="promo-active"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) =>
                                        setFormData((current) => ({
                                            ...current,
                                            isActive: checked,
                                        }))
                                    }
                                    disabled={!canEditPromo}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={isSaving || !canEditPromo} className="w-full">
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            กำลังบันทึก...
                                        </>
                                    ) : editingCode ? (
                                        "บันทึกการแก้ไข"
                                    ) : (
                                        "สร้างโค้ด"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader className="space-y-2">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-lg sm:text-xl">
                        <Ticket className="h-5 w-5" />
                        รายการโค้ดทั้งหมด ({promoCodes.length})
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    {promoCodes.length === 0 ? (
                        <div className="py-12 text-center">
                            <Ticket className="mx-auto h-12 w-12 text-muted-foreground/50" />
                            <p className="mt-4 text-muted-foreground">ยังไม่มีโค้ดโปรโมชั่น</p>
                            <p className="mt-2 text-sm text-muted-foreground">เริ่มสร้างโค้ดส่วนลดหรือโค้ดเติมเครดิตได้เลย</p>
                            <Button onClick={handleOpenCreate} className="mt-4 gap-2" disabled={!canEditPromo}>
                                <Plus className="h-4 w-4" />
                                สร้างโค้ดแรก
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/90 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex flex-wrap gap-2">
                                    {FILTER_OPTIONS.map((option) => {
                                        const isActive = activeFilter === option.value;
                                        const count = promoCodes.filter((code) =>
                                            matchesFilter(code, option.value)
                                        ).length;

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                    setActiveFilter(option.value);
                                                    setCurrentPage(1);
                                                }}
                                                className={cn(
                                                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                                                    isActive
                                                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                                        : "border-border bg-muted text-muted-foreground hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                                                )}
                                            >
                                                <span>{option.label}</span>
                                                <span className={cn("text-xs", isActive ? "text-blue-100" : "text-muted-foreground/70")}>
                                                    ({count})
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <div className="relative w-full flex-1 sm:min-w-52">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                                        <input
                                            type="text"
                                            placeholder="ค้นหาโค้ด..."
                                            value={searchTerm}
                                            onChange={(event) => {
                                                setSearchTerm(event.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="h-11 w-full rounded-2xl border border-border bg-muted pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-blue-500 focus:bg-card focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-500/20"
                                        />
                                    </div>

                                    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                                        <span>แสดง</span>
                                        <select
                                            value={itemsPerPage}
                                            onChange={(event) => {
                                                setItemsPerPage(Number(event.target.value));
                                                setCurrentPage(1);
                                            }}
                                            aria-label="จำนวนรายการต่อหน้า"
                                            className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-500/20"
                                        >
                                            {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                        <span>รายการ</span>
                                    </div>
                                </div>
                            </div>

                            {paginatedCodes.length === 0 ? (
                                <div className="rounded-2xl border border-border bg-card px-4 py-16 text-center shadow-sm">
                                    <Ticket className="mx-auto h-10 w-10 text-muted-foreground/50" />
                                    <p className="mt-3 font-semibold text-foreground">ไม่พบโค้ดที่ตรงเงื่อนไข</p>
                                    <p className="mt-1 text-sm text-muted-foreground">ลองค้นหาด้วยชื่ออื่นหรือเปลี่ยนตัวกรองที่เลือก</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3 md:hidden">
                                        {paginatedCodes.map((code) => {
                                            const status = getPromoStatus(code);

                                            return (
                                                <div
                                                    key={code.id}
                                                    className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1 space-y-2">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <code className="max-w-full break-all rounded bg-muted px-2 py-1 font-mono text-sm">
                                                                    {code.code}
                                                                </code>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 shrink-0"
                                                                    onClick={() => copyCode(code.code)}
                                                                    aria-label={`คัดลอกโค้ด ${code.code}`}
                                                                >
                                                                    <Copy className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Badge variant="outline" className={getCodeTypeBadgeClass(code.codeType)}>
                                                                    {getCodeTypeLabel(code.codeType)}
                                                                </Badge>
                                                                <Badge variant="secondary">{formatDiscount(code)}</Badge>
                                                                <StatusBadge status={status} />
                                                            </div>
                                                        </div>

                                                        <Switch
                                                            checked={code.isActive && status !== "expired"}
                                                            onCheckedChange={() => handleToggleActive(code)}
                                                            disabled={status === "expired" || !canEditPromo || togglingId === code.id}
                                                            aria-label={`เปิดปิดโค้ด ${code.code}`}
                                                        />
                                                    </div>

                                                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                                        <div className="rounded-xl bg-muted/40 p-3">
                                                            <p className="text-xs text-muted-foreground">การใช้งาน</p>
                                                            <div className="mt-1">
                                                                <UsageDisplay used={code.usedCount} limit={code.usageLimit} />
                                                            </div>
                                                        </div>

                                                        <div className="rounded-xl bg-muted/40 p-3">
                                                            <p className="text-xs text-muted-foreground">หมดอายุ</p>
                                                            <p
                                                                className={cn(
                                                                    "mt-1 font-medium",
                                                                    status === "expired" ? "text-rose-600 dark:text-rose-400" : "",
                                                                )}
                                                            >
                                                                {formatExpireDate(code.expiresAt)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3">
                                                        <PromoConditionLines code={code} />
                                                    </div>

                                                    {canEditPromo ? (
                                                        <div className="mt-4 flex gap-2">
                                                            <Button
                                                                variant="outline"
                                                                className="flex-1"
                                                                onClick={() => handleOpenEdit(code)}
                                                                aria-label={`แก้ไขโค้ด ${code.code}`}
                                                            >
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                แก้ไข
                                                            </Button>

                                                            <Button
                                                                variant="outline"
                                                                className="flex-1 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                                                                onClick={() => handleDelete(code.id)}
                                                                aria-label={`ลบโค้ด ${code.code}`}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                ลบ
                                                            </Button>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="hidden overflow-x-auto md:block">
                                        <Table className="min-w-[860px]">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>โค้ด</TableHead>
                                                    <TableHead>มูลค่า</TableHead>
                                                    <TableHead>การใช้งาน</TableHead>
                                                    <TableHead>หมดอายุ</TableHead>
                                                    <TableHead>สถานะ</TableHead>
                                                    <TableHead className="text-right">จัดการ</TableHead>
                                                </TableRow>
                                            </TableHeader>

                                            <TableBody>
                                                {paginatedCodes.map((code) => {
                                                    const status = getPromoStatus(code);

                                                    return (
                                                        <TableRow key={code.id}>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                                                                        {code.code}
                                                                    </code>
                                                                    <Badge variant="outline" className={getCodeTypeBadgeClass(code.codeType)}>
                                                                        {getCodeTypeLabel(code.codeType)}
                                                                    </Badge>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6"
                                                                        onClick={() => copyCode(code.code)}
                                                                        aria-label={`คัดลอกโค้ด ${code.code}`}
                                                                    >
                                                                        <Copy className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>

                                                            <TableCell>
                                                                <Badge variant="secondary">{formatDiscount(code)}</Badge>
                                                                <div className="mt-1">
                                                                    <PromoConditionLines code={code} />
                                                                </div>
                                                            </TableCell>

                                                            <TableCell>
                                                                <UsageDisplay used={code.usedCount} limit={code.usageLimit} />
                                                            </TableCell>

                                                            <TableCell>
                                                                <span className={status === "expired" ? "text-rose-600 dark:text-rose-400" : ""}>
                                                                    {formatExpireDate(code.expiresAt)}
                                                                </span>
                                                            </TableCell>

                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <StatusBadge status={status} />
                                                                    <Switch
                                                                        checked={code.isActive && status !== "expired"}
                                                                        onCheckedChange={() => handleToggleActive(code)}
                                                                        disabled={status === "expired" || !canEditPromo || togglingId === code.id}
                                                                        aria-label={`เปิดปิดโค้ด ${code.code}`}
                                                                    />
                                                                </div>
                                                            </TableCell>

                                                            <TableCell className="text-right">
                                                                {canEditPromo ? (
                                                                    <>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => handleOpenEdit(code)}
                                                                            aria-label={`แก้ไขโค้ด ${code.code}`}
                                                                        >
                                                                            <Pencil className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => handleDelete(code.id)}
                                                                            aria-label={`ลบโค้ด ${code.code}`}
                                                                        >
                                                                            <Trash2 className="h-4 w-4 text-rose-500" />
                                                                        </Button>
                                                                    </>
                                                                ) : null}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between">
                                        <p>
                                            แสดง {filteredCodes.length === 0 ? 0 : startIndex + 1} ถึง {Math.min(startIndex + itemsPerPage, filteredCodes.length)} จาก {filteredCodes.length} รายการ
                                        </p>

                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                                disabled={safeCurrentPage === 1}
                                                aria-label="หน้าก่อนหน้า"
                                                className="h-9 w-9 rounded-xl border-border bg-card disabled:opacity-50"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>

                                            <div className="flex items-center gap-1.5">
                                                {Array.from({ length: totalPages }, (_, index) => index + 1)
                                                    .slice(Math.max(0, safeCurrentPage - 2), Math.max(3, safeCurrentPage + 1))
                                                    .map((pageNumber) => (
                                                        <Button
                                                            key={pageNumber}
                                                            type="button"
                                                            variant={pageNumber === safeCurrentPage ? "default" : "outline"}
                                                            onClick={() => setCurrentPage(pageNumber)}
                                                            className={cn(
                                                                "h-9 min-w-9 rounded-xl px-3",
                                                                pageNumber === safeCurrentPage
                                                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                                                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                                                            )}
                                                        >
                                                            {pageNumber}
                                                        </Button>
                                                    ))}
                                            </div>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                                disabled={safeCurrentPage === totalPages}
                                                aria-label="หน้าถัดไป"
                                                className="h-9 w-9 rounded-xl border-border bg-card disabled:opacity-50"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
