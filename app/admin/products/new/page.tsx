"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Banknote,
    Eye,
    Gem,
    Loader2,
    Package,
    Plus,
    Shield,
    Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrencySettings } from "@/hooks/useCurrencySettings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { ProductImageGalleryField } from "@/components/admin/ProductImageGalleryField";
import { getPointCurrencyName } from "@/lib/currencySettings";
import { PERMISSIONS } from "@/lib/permissions";
import { showError, showSuccess } from "@/lib/swal";
import { splitStock, type StockSeparatorType } from "@/lib/stock";

type DiscountMode = "amount" | "percent";

function normalizeMoney(value: number, currency: string) {
    if (!Number.isFinite(value)) return 0;
    return currency === "POINT" ? Math.round(value) : Math.round(value * 100) / 100;
}

function formatDiscountValue(value: number, currency: string) {
    return currency === "POINT" ? value.toLocaleString() : value.toFixed(2);
}

export default function AddProductPage() {
    const router = useRouter();
    const currencySettings = useCurrencySettings();
    const pointCurrencyName = getPointCurrencyName(currencySettings);
    const permissions = useAdminPermissions();
    const canCreateProduct = permissions.includes(PERMISSIONS.PRODUCT_CREATE);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        price: "",
        discountPrice: "",
        images: [] as string[],
        category: "",
        description: "",
        secretData: "",
        currency: "THB",
        stockSeparator: "newline" as StockSeparatorType,
    });
    const [singleUser, setSingleUser] = useState("");
    const [singlePass, setSinglePass] = useState("");
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");

    const stockItems = useMemo(
        () => splitStock(formData.secretData, formData.stockSeparator),
        [formData.secretData, formData.stockSeparator]
    );
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

    const handleAddSingleStock = () => {
        if (!canCreateProduct) {
            showError("คุณไม่มีสิทธิ์เพิ่มสินค้า");
            return;
        }

        if (!singleUser.trim() || !singlePass.trim()) {
            showError("กรุณากรอก User และ Pass");
            return;
        }

        const newEntry = `${singleUser.trim()} / ${singlePass.trim()}`;
        setFormData((prev) => ({
            ...prev,
            secretData: prev.secretData ? `${prev.secretData}\n${newEntry}` : newEntry,
        }));
        setSingleUser("");
        setSinglePass("");
        showSuccess("เพิ่มสต๊อกสำเร็จ");
    };

    const rebuildSecretData = (items: string[]) => {
        setFormData((prev) => ({ ...prev, secretData: items.join("\n") }));
    };

    const handleDeleteStock = (index: number) => {
        if (!canCreateProduct) {
            showError("คุณไม่มีสิทธิ์แก้ไขสต๊อกสินค้า");
            return;
        }

        const items = stockItems.filter((_, itemIndex) => itemIndex !== index);
        rebuildSecretData(items);
        if (editingIndex === index) {
            setEditingIndex(null);
        }
        showSuccess("ลบสต๊อกสำเร็จ");
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!canCreateProduct) {
            return;
        }

        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!canCreateProduct) {
            showError("คุณไม่มีสิทธิ์เพิ่มสินค้า");
            return;
        }

        if (!formData.title.trim()) {
            showError("กรุณากรอกชื่อสินค้า");
            return;
        }
        if (!formData.price) {
            showError("กรุณากรอกราคา");
            return;
        }
        if (!formData.category.trim()) {
            showError("กรุณากรอกหมวดหมู่");
            return;
        }
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
            const response = await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    image: formData.images[0] || "",
                    discountPrice: normalizedDiscountPrice === null ? "" : String(normalizedDiscountPrice),
                }),
            });

            const data = await response.json();
            if (data.success) {
                showSuccess("สร้างสินค้าสำเร็จ");
                router.push("/admin/products");
            } else {
                showError(`เกิดข้อผิดพลาด: ${data.message}`);
            }
        } catch (error) {
            console.error("[NEW_PRODUCT_SUBMIT]", error);
            showError("ไม่สามารถสร้างสินค้าได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Link
                href="/admin/products"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                กลับไปรายการสินค้า
            </Link>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1a56db] text-white">
                                <Shield className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-foreground">ข้อมูลสินค้า</span>
                        </div>

                        <div className="space-y-6 p-5">
                            <div className="space-y-2">
                                <Label htmlFor="title">ชื่อสินค้า *</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    placeholder="เช่น Valorant ID (Diamond Rank)"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                    disabled={!canCreateProduct}
                                />
                            </div>

                            <div className="space-y-3">
                                <Label>ประเภทสกุลเงิน *</Label>
                                <RadioGroup
                                    value={formData.currency}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({ ...prev, currency: value }))
                                    }
                                    className="grid gap-3 sm:grid-cols-2"
                                    disabled={!canCreateProduct}
                                >
                                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300">
                                        <RadioGroupItem value="THB" id="currency-thb" />
                                        <span className="flex items-center gap-2 text-sm font-medium">
                                            <Banknote className="h-4 w-4 text-green-600" />
                                            บาท (THB)
                                        </span>
                                    </label>
                                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300">
                                        <RadioGroupItem value="POINT" id="currency-point" />
                                        <span className="flex items-center gap-2 text-sm font-medium">
                                            <Gem className="h-4 w-4 text-purple-600" />
                                            {pointCurrencyName} (POINT)
                                        </span>
                                    </label>
                                </RadioGroup>
                                {formData.currency === "POINT" && (
                                    <p className="text-xs text-purple-600">
                                        สินค้านี้จะซื้อได้ด้วย {pointCurrencyName} เท่านั้น
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="price" className="flex items-center gap-2">
                                        {formData.currency === "POINT" ? (
                                            <>
                                                <Gem className="h-4 w-4 text-purple-600" />
                                                ราคา ({pointCurrencyName}) *
                                            </>
                                        ) : (
                                            <>ราคาเต็ม (฿) *</>
                                        )}
                                    </Label>
                                    <Input
                                        id="price"
                                        name="price"
                                        type="number"
                                        placeholder={formData.currency === "POINT" ? "เช่น 100" : "เช่น 1500"}
                                        min="0"
                                        step={formData.currency === "POINT" ? "1" : "0.01"}
                                        value={formData.price}
                                        onChange={handleChange}
                                        required
                                        disabled={!canCreateProduct}
                                        className={
                                            formData.currency === "POINT"
                                                ? "border-purple-300 focus:border-purple-500"
                                                : ""
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="discountPrice" className="flex items-center gap-2">
                                        <span className="text-red-500">🎁</span>
                                        ส่วนลด
                                    </Label>
                                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/75 p-3">
                                            <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                type="button"
                                                variant={discountMode === "amount" ? "default" : "outline"}
                                                className="rounded-xl"
                                                onClick={() => setDiscountMode("amount")}
                                                disabled={!canCreateProduct}
                                            >
                                                ลดเป็น{formData.currency === "POINT" ? pointCurrencyName : "บาท"}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={discountMode === "percent" ? "default" : "outline"}
                                                className="rounded-xl"
                                                onClick={() => setDiscountMode("percent")}
                                                disabled={!canCreateProduct}
                                            >
                                                ลดเป็น %
                                            </Button>
                                        </div>
                                        <Input
                                            id="discountPrice"
                                            name="discountPrice"
                                            type="number"
                                            placeholder={
                                                discountMode === "percent"
                                                    ? "เช่น 15"
                                                    : formData.currency === "POINT"
                                                        ? "เช่น 100"
                                                        : "เช่น 100"
                                            }
                                            min="0"
                                            max={discountMode === "percent" ? "99.99" : undefined}
                                            step={discountMode === "percent" ? "0.01" : formData.currency === "POINT" ? "1" : "0.01"}
                                            value={formData.discountPrice}
                                            onChange={handleChange}
                                            disabled={!canCreateProduct}
                                            className={
                                                hasDiscountPrice
                                                    ? "border-amber-300 bg-amber-50/40 focus:border-amber-500"
                                                    : "bg-white"
                                            }
                                        />
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">
                                                {discountMode === "percent"
                                                    ? "กรอกเปอร์เซ็นที่ต้องการลด"
                                                    : `กรอกจำนวน${formData.currency === "POINT" ? pointCurrencyName : "บาท"}ที่ต้องการลด`}
                                            </span>
                                            {hasDiscountPrice && !isDiscountValueValid ? (
                                                <span className="font-medium text-rose-600">
                                                    {discountMode === "percent"
                                                        ? "เปอร์เซ็นต์ต้องน้อยกว่า 100%"
                                                        : "จำนวนส่วนลดต้องน้อยกว่าราคาเต็ม"}
                                                </span>
                                            ) : normalizedDiscountPrice !== null && (
                                                <span className="font-medium text-amber-700">
                                                    ลด {formatDiscountValue(discountInputNumber, formData.currency)}
                                                    {discountMode === "percent" ? "%" : formData.currency === "POINT" ? ` ${pointCurrencyName}` : " บาท"}
                                                    {" เหลือ "}
                                                    {formatDiscountValue(normalizedDiscountPrice, formData.currency)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        หากตั้งค่าส่วนลด สินค้าจะแสดงใน &quot;สินค้าลดราคา&quot;
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
                                    disabled={!canCreateProduct}
                                />
                            </div>

                            <div className="space-y-3">
                                <Label>รูปภาพสินค้า</Label>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                    <ProductImageGalleryField
                                        images={formData.images}
                                        disabled={!canCreateProduct}
                                        onChange={(images) => setFormData((prev) => ({ ...prev, images }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">รายละเอียด</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="รายละเอียดสินค้า เช่น แรงค์, สกินที่มี, Agent ที่ปลดล็อก..."
                                    rows={4}
                                    value={formData.description}
                                    onChange={handleChange}
                                    disabled={!canCreateProduct}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">สรุปสต๊อกก่อนสร้างสินค้า</p>
                                </div>
                                <Badge className="rounded-full bg-blue-600 px-3 py-1 text-white hover:bg-blue-600">
                                    {stockItems.length} รายการ
                                </Badge>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3.5">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white">
                                    <Package className="h-4 w-4" />
                                </div>
                                <span className="font-bold text-foreground">เพิ่มสต๊อก 1 รายการ</span>
                                {stockItems.length > 0 && (
                                    <Badge variant="secondary" className="ml-auto">
                                        {stockItems.length} รายการ
                                    </Badge>
                                )}
                            </div>

                            <div className="space-y-4 p-5">
                                <div className="space-y-2">
                                    <Label htmlFor="singleUser">User *</Label>
                                    <Input
                                        id="singleUser"
                                        placeholder="เช่น username123"
                                        value={singleUser}
                                        onChange={(e) => setSingleUser(e.target.value)}
                                        disabled={!canCreateProduct}
                                        className="font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="singlePass">Pass *</Label>
                                    <Input
                                        id="singlePass"
                                        placeholder="เช่น password456"
                                        value={singlePass}
                                        onChange={(e) => setSinglePass(e.target.value)}
                                        disabled={!canCreateProduct}
                                        className="font-mono"
                                    />
                                </div>

                                <Button
                                    type="button"
                                    className="w-full gap-2 rounded-xl bg-[#1a56db] text-white hover:bg-[#1e40af]"
                                    onClick={handleAddSingleStock}
                                    disabled={!canCreateProduct}
                                >
                                    <Plus className="h-4 w-4" />
                                    เพิ่มสต๊อก
                                </Button>

                                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                    แต่ละรายการจะถูกส่งให้ลูกค้าทีละ 1 ชิ้นเมื่อซื้อ
                                </p>
                            </div>
                        </div>

                        {stockItems.length > 0 && (
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3.5">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1a56db] text-white">
                                        <Eye className="h-4 w-4" />
                                    </div>
                                    <span className="font-bold text-foreground">รายการสต๊อก</span>
                                    <Badge variant="secondary" className="ml-auto">
                                        {stockItems.length} รายการ
                                    </Badge>
                                </div>

                                <div className="p-5">
                                    <div className="space-y-2 overflow-y-auto max-h-64">
                                        {stockItems.map((item, index) => (
                                            <div
                                                key={`${item}-${index}`}
                                                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm"
                                            >
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        #{index + 1}
                                                    </Badge>
                                                    <span className="max-w-[220px] truncate font-mono text-xs">
                                                        {item}
                                                    </span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                                    onClick={() => handleDeleteStock(index)}
                                                    disabled={!canCreateProduct}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="sticky bottom-4 z-10 flex justify-end">
                    <div className="flex w-full max-w-md items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">พร้อมสร้างสินค้าใหม่</p>
                            <p className="text-xs text-slate-500">สต๊อกเริ่มต้น {stockItems.length} รายการ</p>
                        </div>
                        <Button
                            type="submit"
                            className="min-w-[150px] rounded-xl bg-[#1a56db] text-white hover:bg-[#1e40af]"
                            size="lg"
                            disabled={!canCreateProduct || isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    กำลังสร้าง...
                                </>
                            ) : (
                                "สร้างสินค้า"
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
