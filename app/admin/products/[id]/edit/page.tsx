"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Pencil, Gem, Banknote, Package, Upload, X, Timer, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { showSuccess, showError } from "@/lib/swal";
import { compressImage } from "@/lib/compressImage";

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params.id as string;

    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
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
    const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false);

    // Fetch product data on mount
    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await fetch(`/api/products/${productId}`);
                const data = await response.json();

                if (data.success && data.data) {
                    const product = data.data;
                    setFormData({
                        title: product.name || "",
                        price: product.price?.toString() || "",
                        discountPrice: product.discountPrice?.toString() || "",
                        image: product.imageUrl || "",
                        category: product.category || "",
                        description: product.description || "",
                        secretData: product.secretData || "",
                        currency: product.currency || "THB",
                        stockSeparator: product.stockSeparator || "newline",
                        autoDeleteAfterSale: product.autoDeleteAfterSale?.toString() || "",
                    });
                    if (product.autoDeleteAfterSale) setAutoDeleteEnabled(true);
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

    // Handle file upload
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
                showSuccess("อัพโหลดรูปสำเร็จ!");
            } else {
                showError(data.message || "อัพโหลดไม่สำเร็จ");
            }
        } catch (error) {
            console.error("[EDIT_PRODUCT_UPLOAD]", error);
            showError(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัพโหลด");
        } finally {
            setIsUploading(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    autoDeleteAfterSale: autoDeleteEnabled && formData.autoDeleteAfterSale ? Number(formData.autoDeleteAfterSale) : null,
                }),
            });

            const data = await response.json();

            if (data.success) {
                showSuccess("🎉 แก้ไขสินค้าสำเร็จ! ข้อมูลสินค้าถูกอัพเดทเรียบร้อยแล้ว");
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

    return (
        <div className="space-y-6">
            {/* Navigation */}
            <div className="flex items-center justify-between">
                <Link
                    href="/admin/products"
                    className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    กลับไปรายการสินค้า
                </Link>
                <Link href={`/admin/products/${productId}/stock`}>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Package className="h-4 w-4" />
                        จัดการสต็อก
                    </Button>
                </Link>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl">
                            <Pencil className="h-6 w-6 text-indigo-600" />
                            ข้อมูลสินค้า
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">ชื่อสินค้า *</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="เช่น Valorant ID (Diamond Rank)"
                                value={formData.title}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* Currency Type */}
                        <div className="space-y-3">
                            <Label>ประเภทสกุลเงิน *</Label>
                            <RadioGroup
                                value={formData.currency}
                                onValueChange={(value) =>
                                    setFormData((prev) => ({ ...prev, currency: value }))
                                }
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="THB" id="currency-thb" />
                                    <Label htmlFor="currency-thb" className="flex items-center gap-2 cursor-pointer">
                                        <Banknote className="h-4 w-4 text-green-600" />
                                        บาท (THB)
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="POINT" id="currency-point" />
                                    <Label htmlFor="currency-point" className="flex items-center gap-2 cursor-pointer">
                                        <Gem className="h-4 w-4 text-purple-600" />
                                        พอยท์ (POINT)
                                    </Label>
                                </div>
                            </RadioGroup>
                            {formData.currency === "POINT" && (
                                <p className="text-xs text-purple-600">
                                    💎 สินค้านี้จะซื้อได้ด้วย Point เท่านั้น
                                </p>
                            )}
                        </div>

                        {/* Price & Discount Row */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="price" className="flex items-center gap-2">
                                    {formData.currency === "POINT" ? (
                                        <><Gem className="h-4 w-4 text-purple-600" /> ราคา (Point) *</>
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
                                    className={formData.currency === "POINT" ? "border-purple-300 focus:border-purple-500" : ""}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="discountPrice" className="flex items-center gap-2">
                                    <span className="text-red-500">🎁</span>
                                    ราคาลด {formData.currency === "POINT" ? "(Point)" : "(฿)"}
                                </Label>
                                <Input
                                    id="discountPrice"
                                    name="discountPrice"
                                    type="number"
                                    placeholder="เว้นว่างถ้าไม่ลดราคา"
                                    min="0"
                                    step={formData.currency === "POINT" ? "1" : "0.01"}
                                    value={formData.discountPrice}
                                    onChange={handleChange}
                                    className="border-red-200 focus:border-red-400"
                                />
                                <p className="text-xs text-muted-foreground">
                                    หากกรอกราคานี้ สินค้าจะแสดงใน &quot;สินค้าลดราคา&quot;
                                </p>
                            </div>
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                            <Label htmlFor="category">หมวดหมู่ *</Label>
                            <Input
                                id="category"
                                name="category"
                                placeholder="เช่น ROV, Valorant, Genshin"
                                value={formData.category}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* Image Upload/URL */}
                        <div className="space-y-3">
                            <Label>รูปภาพสินค้า</Label>

                            {/* File Upload */}
                            <div className="flex gap-2">
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
                                    className="gap-2"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    {isUploading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Upload className="h-4 w-4" />
                                    )}
                                    {isUploading ? "กำลังปรับปรุงภาพ..." : "อัพโหลดจากเครื่อง"}
                                </Button>
                                <span className="text-sm text-muted-foreground self-center">หรือ</span>
                            </div>

                            {/* URL Input */}
                            <div className="flex gap-2">
                                <Input
                                    id="image"
                                    name="image"
                                    placeholder="วาง URL รูปภาพ..."
                                    value={formData.image}
                                    onChange={handleChange}
                                    className="flex-1"
                                />
                                {formData.image && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setFormData(prev => ({ ...prev, image: "" }))}
                                        className="text-red-500 hover:text-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            {/* Preview */}
                            {formData.image && (
                                <div className="mt-2 relative aspect-video rounded-lg overflow-hidden bg-muted max-w-xs border">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={formData.image}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = "https://placehold.co/400x300/f1f5f9/64748b?text=Invalid+URL";
                                        }}
                                    />
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground">
                                รองรับไฟล์ JPG, PNG, WebP, GIF (สูงสุด 5MB)
                            </p>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">รายละเอียด</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="รายละเอียดสินค้า เช่น แรงค์, สกินที่มี, Agent ที่ปลดล็อค..."
                                rows={4}
                                value={formData.description}
                                onChange={handleChange}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Auto-Delete Card */}
                <Card className="border-orange-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Timer className="h-5 w-5 text-orange-500" />
                            ลบอัตโนมัติหลังซื้อ
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-sm">เปิดใช้งาน</p>
                                <p className="text-xs text-muted-foreground">สินค้าจะถูกลบออกอัตโนมัติหลังถูกซื้อตามเวลาที่ตั้ง</p>
                            </div>
                            <Switch
                                checked={autoDeleteEnabled}
                                onCheckedChange={setAutoDeleteEnabled}
                            />
                        </div>

                        {autoDeleteEnabled && (
                            <div className="space-y-3 pt-2 border-t">
                                {/* Quick presets */}
                                <div>
                                    <Label className="text-sm">เลือกเวลาด่วน</Label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {[
                                            { label: "30 นาที", value: "30" },
                                            { label: "1 ชม.", value: "60" },
                                            { label: "6 ชม.", value: "360" },
                                            { label: "12 ชม.", value: "720" },
                                            { label: "1 วัน", value: "1440" },
                                            { label: "3 วัน", value: "4320" },
                                            { label: "7 วัน", value: "10080" },
                                        ].map((preset) => (
                                            <button
                                                key={preset.value}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, autoDeleteAfterSale: preset.value }))}
                                                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                                                    formData.autoDeleteAfterSale === preset.value
                                                        ? "bg-orange-500 text-white border-orange-500"
                                                        : "border-orange-300 text-orange-600 hover:bg-orange-50"
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom input */}
                                <div className="space-y-1">
                                    <Label htmlFor="autoDeleteAfterSale" className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        หรือกรอกจำนวนนาทีเอง
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="autoDeleteAfterSale"
                                            name="autoDeleteAfterSale"
                                            type="number"
                                            min="1"
                                            placeholder="เช่น 60"
                                            value={formData.autoDeleteAfterSale}
                                            onChange={handleChange}
                                            className="w-40 border-orange-300"
                                        />
                                        <span className="text-sm text-muted-foreground">นาที</span>
                                        {formData.autoDeleteAfterSale && (
                                            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                                                ≈ {Number(formData.autoDeleteAfterSale) >= 1440
                                                    ? `${(Number(formData.autoDeleteAfterSale) / 1440).toFixed(1)} วัน`
                                                    : Number(formData.autoDeleteAfterSale) >= 60
                                                    ? `${(Number(formData.autoDeleteAfterSale) / 60).toFixed(1)} ชั่วโมง`
                                                    : `${formData.autoDeleteAfterSale} นาที`}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground bg-orange-50 p-2 rounded-lg border border-orange-200">
                                    ⚠️ เมื่อสินค้าถูกซื้อ ระบบจะตั้งเวลาลบสินค้านี้ออกอัตโนมัติตามเวลาที่กำหนด
                                    โดยจะลบเมื่อ Cron Job ทำงาน (เรียก <code className="text-xs bg-orange-100 px-1 rounded">/api/admin/auto-delete/run</code>)
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Submit Button */}
                <Button
                    type="submit"
                    className="w-full"
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
