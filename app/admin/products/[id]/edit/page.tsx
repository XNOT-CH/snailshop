"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { showError, showSuccess } from "@/lib/swal";
import { compressImage } from "@/lib/compressImage";
import {
    ArrowLeft,
    Banknote,
    Clock,
    Gem,
    Loader2,
    Package,
    Pencil,
    Timer,
    Upload,
    X,
} from "lucide-react";

const AUTO_DELETE_PRESETS = [
    { label: "30 นาที", value: "30" },
    { label: "1 ชม.", value: "60" },
    { label: "6 ชม.", value: "360" },
    { label: "12 ชม.", value: "720" },
    { label: "1 วัน", value: "1440" },
    { label: "3 วัน", value: "4320" },
    { label: "7 วัน", value: "10080" },
];

type DiscountMode = "amount" | "percent";

function normalizeMoney(value: number, currency: string) {
    if (!Number.isFinite(value)) return 0;
    return currency === "POINT" ? Math.round(value) : Math.round(value * 100) / 100;
}

function formatDiscountValue(value: number, currency: string) {
    return currency === "POINT" ? value.toLocaleString() : value.toFixed(2);
}

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params.id as string;

    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false);
    const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        title: "",
        price: "",
        discountPrice: "",
        image: "",
        category: "",
        description: "",
        secretData: "",
        currency: "THB",
        stockSeparator: "newline",
        autoDeleteAfterSale: "",
    });

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await fetch(`/api/products/${productId}`);
                const data = await response.json();

                if (data.success && data.data) {
                    const product = data.data;
                    const priceNumber = Number(product.price ?? 0);
                    const discountPriceNumber = product.discountPrice ? Number(product.discountPrice) : null;
                    const discountAmount =
                        discountPriceNumber !== null &&
                        Number.isFinite(priceNumber) &&
                        Number.isFinite(discountPriceNumber) &&
                        discountPriceNumber < priceNumber
                            ? normalizeMoney(priceNumber - discountPriceNumber, product.currency || "THB")
                            : null;
                    setFormData({
                        title: product.name || "",
                        price: product.price?.toString() || "",
                        discountPrice: discountAmount !== null ? discountAmount.toString() : "",
                        image: product.imageUrl || "",
                        category: product.category || "",
                        description: product.description || "",
                        secretData: product.secretData || "",
                        currency: product.currency || "THB",
                        stockSeparator: product.stockSeparator || "newline",
                        autoDeleteAfterSale: product.autoDeleteAfterSale?.toString() || "",
                    });
                    setDiscountMode("amount");
                    if (product.autoDeleteAfterSale) {
                        setAutoDeleteEnabled(true);
                    }
                } else {
                    showError("ไม่พบสินค้า");
                    router.push("/admin/products");
                }
            } catch (error) {
                console.error("[EDIT_PRODUCT_FETCH]", error);
                showError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
                router.push("/admin/products");
            } finally {
                setIsFetching(false);
            }
        };

        fetchProduct();
    }, [productId, router]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const compressed = await compressImage(file);
            const uploadFormData = new FormData();
            uploadFormData.append("file", compressed);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: uploadFormData,
            });

            const data = await res.json();
            if (data.success) {
                setFormData((prev) => ({ ...prev, image: data.url }));
                showSuccess("อัปโหลดรูปสำเร็จ");
            } else {
                showError(data.message || "อัปโหลดไม่สำเร็จ");
            }
        } catch (error) {
            console.error("[EDIT_PRODUCT_UPLOAD]", error);
            showError(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปโหลด");
        } finally {
            setIsUploading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const hasDiscountPrice = formData.discountPrice.trim().length > 0;
        const priceNumber = Number(formData.price);
        const discountInputNumber = Number(formData.discountPrice);
        const calculatedDiscountPrice =
            hasDiscountPrice && Number.isFinite(priceNumber) && priceNumber > 0 && Number.isFinite(discountInputNumber)
                ? discountMode === "percent"
                    ? normalizeMoney(priceNumber - (priceNumber * discountInputNumber) / 100, formData.currency)
                    : normalizeMoney(priceNumber - discountInputNumber, formData.currency)
                : null;
        const normalizedDiscountPrice =
            calculatedDiscountPrice !== null && calculatedDiscountPrice > 0 ? calculatedDiscountPrice : null;

        if (hasDiscountPrice) {
            if (!Number.isFinite(discountInputNumber) || discountInputNumber <= 0) {
                showError(discountMode === "percent" ? "กรุณากรอกเปอร์เซ็นส่วนลดให้ถูกต้อง" : "กรุณากรอกจำนวนส่วนลดให้ถูกต้อง");
                return;
            }
            if (discountMode === "percent" && discountInputNumber >= 100) {
                showError("ส่วนลดแบบเปอร์เซ็นต้องน้อยกว่า 100%");
                return;
            }
            if (normalizedDiscountPrice === null) {
                showError("ราคาหลังลดต้องมากกว่า 0");
                return;
            }
        }
        setIsLoading(true);

        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    discountPrice: normalizedDiscountPrice === null ? "" : String(normalizedDiscountPrice),
                    autoDeleteAfterSale:
                        autoDeleteEnabled && formData.autoDeleteAfterSale
                            ? Number(formData.autoDeleteAfterSale)
                            : null,
                }),
            });

            const data = await response.json();

            if (data.success) {
                showSuccess("แก้ไขสินค้าสำเร็จ");
                router.push("/admin/products");
            } else {
                showError(`เกิดข้อผิดพลาด: ${data.message}`);
            }
        } catch (error) {
            console.error("[EDIT_PRODUCT_SUBMIT]", error);
            showError("ไม่สามารถแก้ไขสินค้าได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const isPointCurrency = formData.currency === "POINT";
    const hasDiscountPrice = formData.discountPrice.trim().length > 0;
    const priceNumber = Number(formData.price);
    const discountInputNumber = Number(formData.discountPrice);
    const isDiscountValueValid =
        !hasDiscountPrice ||
        (Number.isFinite(discountInputNumber) &&
            discountInputNumber > 0 &&
            (discountMode === "percent" ? discountInputNumber < 100 : discountInputNumber < priceNumber));
    const calculatedDiscountPrice =
        hasDiscountPrice &&
        isDiscountValueValid &&
        Number.isFinite(priceNumber) &&
        priceNumber > 0 &&
        Number.isFinite(discountInputNumber)
            ? discountMode === "percent"
                ? normalizeMoney(priceNumber - (priceNumber * discountInputNumber) / 100, formData.currency)
                : normalizeMoney(priceNumber - discountInputNumber, formData.currency)
            : null;
    const normalizedDiscountPrice =
        calculatedDiscountPrice !== null && calculatedDiscountPrice > 0 ? calculatedDiscountPrice : null;
    const autoDeleteMinutes = Number(formData.autoDeleteAfterSale);
    const autoDeleteSummary = formData.autoDeleteAfterSale
        ? autoDeleteMinutes >= 1440
            ? `${(autoDeleteMinutes / 1440).toFixed(1)} วัน`
            : autoDeleteMinutes >= 60
                ? `${(autoDeleteMinutes / 60).toFixed(1)} ชั่วโมง`
                : `${formData.autoDeleteAfterSale} นาที`
        : null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                    href="/admin/products"
                    className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    กลับไปรายการสินค้า
                </Link>
                <Link href={`/admin/products/${productId}/stock`}>
                    <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                        <Package className="h-4 w-4" />
                        จัดการสต๊อก
                    </Button>
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <Card className="overflow-hidden border-slate-200/80 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.35)]">
                    <CardHeader className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(248,250,252,0.95),rgba(239,246,255,0.88))] px-6 py-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-3 text-2xl text-slate-900">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                                        <Pencil className="h-5 w-5" />
                                    </span>
                                    ข้อมูลสินค้า
                                </CardTitle>
                                <p className="text-sm text-slate-500">
                                    จัดข้อมูลหลัก รูปสินค้า และราคาขายให้อ่านง่ายก่อนบันทึก
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium text-slate-600">
                                    หมวดหมู่ {formData.category || "ยังไม่ระบุ"}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${isPointCurrency ? "border-violet-200 bg-violet-50 text-violet-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
                                >
                                    {isPointCurrency ? "POINT" : "THB"}
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                            <div className="space-y-6">
                                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="mb-4 flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                                        <p className="text-sm font-semibold text-slate-900">รายละเอียดหลัก</p>
                                    </div>

                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <Label htmlFor="title">ชื่อสินค้า *</Label>
                                            <Input
                                                id="title"
                                                name="title"
                                                placeholder="เช่น Valorant ID (Diamond Rank)"
                                                value={formData.title}
                                                onChange={handleChange}
                                                required
                                                className="bg-white"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label>ประเภทสกุลเงิน *</Label>
                                                <span className="text-xs text-slate-400">เลือก 1 รูปแบบการขาย</span>
                                            </div>

                                            <RadioGroup
                                                value={formData.currency}
                                                onValueChange={(value) =>
                                                    setFormData((prev) => ({ ...prev, currency: value }))
                                                }
                                                className="grid gap-3 sm:grid-cols-2"
                                            >
                                                <Label
                                                    htmlFor="currency-thb"
                                                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${!isPointCurrency ? "border-emerald-300 bg-emerald-50/80 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
                                                >
                                                    <RadioGroupItem value="THB" id="currency-thb" />
                                                    <Banknote className="h-4 w-4 text-emerald-600" />
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-medium text-slate-900">บาท (THB)</p>
                                                        <p className="text-xs text-slate-500">แสดงราคาแบบปกติหน้าเว็บ</p>
                                                    </div>
                                                </Label>

                                                <Label
                                                    htmlFor="currency-point"
                                                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${isPointCurrency ? "border-violet-300 bg-violet-50/80 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
                                                >
                                                    <RadioGroupItem value="POINT" id="currency-point" />
                                                    <Gem className="h-4 w-4 text-violet-600" />
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-medium text-slate-900">พอยท์ (POINT)</p>
                                                        <p className="text-xs text-slate-500">เหมาะกับสินค้ารางวัลหรือไอเทมพิเศษ</p>
                                                    </div>
                                                </Label>
                                            </RadioGroup>

                                            {isPointCurrency && (
                                                <p className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700">
                                                    สินค้านี้จะซื้อได้ด้วย Point เท่านั้น
                                                </p>
                                            )}
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50/65 p-4">
                                                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                                                    {isPointCurrency ? <Gem className="h-4 w-4 text-violet-600" /> : <Banknote className="h-4 w-4 text-emerald-600" />}
                                                    ราคาเต็ม *
                                                </div>
                                                <Input
                                                    id="price"
                                                    name="price"
                                                    type="number"
                                                    placeholder={isPointCurrency ? "เช่น 100" : "เช่น 1500"}
                                                    min="0"
                                                    step={isPointCurrency ? "1" : "0.01"}
                                                    value={formData.price}
                                                    onChange={handleChange}
                                                    required
                                                    className={`bg-white ${isPointCurrency ? "border-violet-200 focus-visible:ring-violet-200" : "border-emerald-200 focus-visible:ring-emerald-200"}`}
                                                />
                                            </div>

                                            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                                                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-rose-700">
                                                    <span className="text-base">🎁</span>
                                                    ส่วนลด
                                                </div>
                                                <div className="space-y-2 rounded-2xl border border-rose-200/70 bg-white/70 p-3">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Button
                                                            type="button"
                                                            variant={discountMode === "amount" ? "default" : "outline"}
                                                            className="rounded-xl"
                                                            onClick={() => setDiscountMode("amount")}
                                                        >
                                                            ลดเป็น{isPointCurrency ? "พอยท์" : "บาท"}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant={discountMode === "percent" ? "default" : "outline"}
                                                            className="rounded-xl"
                                                            onClick={() => setDiscountMode("percent")}
                                                        >
                                                            ลดเป็น %
                                                        </Button>
                                                    </div>
                                                    <Input
                                                        id="discountPrice"
                                                        name="discountPrice"
                                                        type="number"
                                                        placeholder={discountMode === "percent" ? "เช่น 15" : "เว้นว่างถ้าไม่ลดราคา"}
                                                        min="0"
                                                        max={discountMode === "percent" ? "99.99" : undefined}
                                                        step={discountMode === "percent" ? "0.01" : isPointCurrency ? "1" : "0.01"}
                                                        value={formData.discountPrice}
                                                        onChange={handleChange}
                                                        className="border-rose-200 bg-white focus-visible:ring-rose-200"
                                                    />
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-500">
                                                            {discountMode === "percent"
                                                                ? "กรอกเปอร์เซ็นที่ต้องการลด"
                                                                : `กรอกจำนวน${isPointCurrency ? "พอยท์" : "บาท"}ที่ต้องการลด`}
                                                        </span>
                                                        {hasDiscountPrice && !isDiscountValueValid ? (
                                                            <span className="font-medium text-rose-600">
                                                                {discountMode === "percent"
                                                                    ? "เปอร์เซ็นต์ต้องน้อยกว่า 100%"
                                                                    : "จำนวนส่วนลดต้องน้อยกว่าราคาเต็ม"}
                                                            </span>
                                                        ) : normalizedDiscountPrice !== null && (
                                                            <span className="font-medium text-rose-700">
                                                                ลด {formatDiscountValue(discountInputNumber, formData.currency)}
                                                                {discountMode === "percent" ? "%" : isPointCurrency ? " พอยท์" : " บาท"}
                                                                {" เหลือ "}
                                                                {formatDiscountValue(normalizedDiscountPrice, formData.currency)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="mt-2 text-xs text-rose-600/80">
                                                    หากตั้งค่าส่วนลด สินค้าจะแสดงในหมวดสินค้าลดราคา
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="category">หมวดหมู่ *</Label>
                                            <Input
                                                id="category"
                                                name="category"
                                                placeholder="เช่น ROV, Valorant, Genshin"
                                                value={formData.category}
                                                onChange={handleChange}
                                                required
                                                className="bg-white"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="description">รายละเอียด</Label>
                                            <Textarea
                                                id="description"
                                                name="description"
                                                placeholder="รายละเอียดสินค้า เช่น แรงค์, สกินที่มี, Agent ที่ปลดล็อค..."
                                                rows={5}
                                                value={formData.description}
                                                onChange={handleChange}
                                                className="bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,1))] p-5 shadow-sm">
                                    <div className="mb-4 flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                                        <p className="text-sm font-semibold text-slate-900">ภาพสินค้า</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                                            <div className="relative aspect-[4/3] w-full">
                                                {formData.image ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={formData.image}
                                                        alt="Preview"
                                                        className="h-full w-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = "https://placehold.co/400x300/f1f5f9/64748b?text=Invalid+URL";
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_55%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 text-center">
                                                        <div className="space-y-2">
                                                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/90 shadow-sm ring-1 ring-slate-200">
                                                                <Upload className="h-6 w-6 text-sky-600" />
                                                            </div>
                                                            <p className="text-sm font-medium text-slate-700">ยังไม่มีรูปสินค้า</p>
                                                            <p className="text-xs text-slate-500">อัปโหลดจากเครื่องหรือวางลิงก์รูปจากด้านล่าง</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,image/gif"
                                                className="hidden"
                                                onChange={handleFileUpload}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-11 justify-center gap-2 rounded-xl border-slate-300 bg-white"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                            >
                                                {isUploading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Upload className="h-4 w-4" />
                                                )}
                                                {isUploading ? "กำลังปรับรูป..." : "อัปโหลดจากเครื่อง"}
                                            </Button>

                                            {formData.image && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    onClick={() => setFormData((prev) => ({ ...prev, image: "" }))}
                                                    className="h-11 gap-2 rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                                >
                                                    <X className="h-4 w-4" />
                                                    ล้างรูป
                                                </Button>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="image">ลิงก์รูปภาพ</Label>
                                            <Input
                                                id="image"
                                                name="image"
                                                placeholder="วาง URL รูปภาพ หรือใช้ path ที่อัปโหลดแล้ว"
                                                value={formData.image}
                                                onChange={handleChange}
                                                className="bg-white"
                                            />
                                        </div>

                                        <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs leading-relaxed text-slate-500">
                                            รองรับ JPG, PNG, WebP, GIF สูงสุด 5MB ระบบจะย่อ บีบอัด และแปลงไฟล์ให้อัตโนมัติก่อนบันทึก
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-amber-200/80 shadow-[0_18px_50px_-42px_rgba(245,158,11,0.6)]">
                    <CardHeader className="border-b border-amber-100 bg-[linear-gradient(135deg,rgba(255,251,235,1),rgba(255,247,237,0.95))] px-6 py-5">
                        <CardTitle className="flex items-center gap-3 text-xl text-amber-950">
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-amber-500 ring-1 ring-amber-200">
                                <Timer className="h-5 w-5" />
                            </span>
                            ลบอัตโนมัติหลังซื้อ
                            {autoDeleteEnabled && autoDeleteSummary && (
                                <Badge className="ml-auto rounded-full bg-amber-500/10 px-3 py-1 text-amber-700 hover:bg-amber-500/10">
                                    {autoDeleteSummary}
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-5 p-6">
                        <div className="flex items-start justify-between gap-4 rounded-2xl border border-amber-100 bg-white p-4">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-900">เปิดใช้งาน</p>
                                <p className="text-xs text-slate-500">
                                    สินค้าจะถูกลบออกอัตโนมัติหลังถูกซื้อตามเวลาที่กำหนด
                                </p>
                            </div>
                            <Switch checked={autoDeleteEnabled} onCheckedChange={setAutoDeleteEnabled} />
                        </div>

                        {autoDeleteEnabled && (
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                                <div className="rounded-2xl border border-amber-100 bg-white p-4">
                                    <Label className="text-sm font-medium text-slate-800">เลือกเวลาด่วน</Label>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {AUTO_DELETE_PRESETS.map((preset) => (
                                            <button
                                                key={preset.value}
                                                type="button"
                                                onClick={() => setFormData((prev) => ({ ...prev, autoDeleteAfterSale: preset.value }))}
                                                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                                    formData.autoDeleteAfterSale === preset.value
                                                        ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                                                        : "border-amber-200 bg-amber-50/70 text-amber-700 hover:bg-amber-100"
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                                    <Label htmlFor="autoDeleteAfterSale" className="flex items-center gap-2 text-sm font-medium text-slate-800">
                                        <Clock className="h-3.5 w-3.5" />
                                        กำหนดเวลาเอง
                                    </Label>
                                    <div className="mt-3 flex items-center gap-2">
                                        <Input
                                            id="autoDeleteAfterSale"
                                            name="autoDeleteAfterSale"
                                            type="number"
                                            min="1"
                                            placeholder="เช่น 60"
                                            value={formData.autoDeleteAfterSale}
                                            onChange={handleChange}
                                            className="w-36 border-amber-200 bg-white focus-visible:ring-amber-200"
                                        />
                                        <span className="text-sm text-slate-500">นาที</span>
                                    </div>
                                    {autoDeleteSummary && (
                                        <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                                            ระยะเวลาที่เลือก: {autoDeleteSummary}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                    </CardContent>
                </Card>

                <Button
                    type="submit"
                    className="h-12 w-full rounded-2xl bg-[#1a56db] text-white shadow-[0_20px_45px_-25px_rgba(37,99,235,0.7)] hover:bg-[#1e40af]"
                    size="lg"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            กำลังบันทึก...
                        </>
                    ) : (
                        "บันทึกการเปลี่ยนแปลง"
                    )}
                </Button>
            </form>
        </div>
    );
}
