"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Shield, Gem, Banknote, Package, Eye, Plus, Pencil, Trash2, Check, X, Upload, ImageIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { showSuccess, showError } from "@/lib/swal";
import { splitStock, type StockSeparatorType } from "@/lib/stock";

export default function AddProductPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        price: "",
        discountPrice: "",
        image: "",
        category: "",
        description: "",
        secretData: "",
        currency: "THB",
        stockSeparator: "newline" as StockSeparatorType,
    });

    // Single stock add form
    const [showAddForm, setShowAddForm] = useState(false);
    const [singleUser, setSingleUser] = useState("");
    const [singlePass, setSinglePass] = useState("");

    // Image upload
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Edit stock item
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editUser, setEditUser] = useState("");
    const [editPass, setEditPass] = useState("");

    const handleAddSingleStock = () => {
        if (!singleUser.trim() || !singlePass.trim()) {
            showError("กรุณากรอก User และ Pass");
            return;
        }
        const newEntry = `${singleUser.trim()} / ${singlePass.trim()}`;
        setFormData((prev) => ({
            ...prev,
            secretData: prev.secretData ? prev.secretData + "\n" + newEntry : newEntry,
        }));
        setSingleUser("");
        setSinglePass("");
        setShowAddForm(false);
        showSuccess("เพิ่มสต็อกสำเร็จ");
    };

    const rebuildSecretData = (items: string[]) => {
        setFormData((prev) => ({ ...prev, secretData: items.join("\n") }));
    };

    const handleEditStock = (index: number, item: string) => {
        const parts = item.split(" / ");
        setEditUser(parts[0]?.trim() || item);
        setEditPass(parts[1]?.trim() || "");
        setEditingIndex(index);
    };

    const handleSaveEditStock = () => {
        if (editingIndex === null) return;
        if (!editUser.trim() || !editPass.trim()) {
            showError("กรุณากรอก User และ Pass");
            return;
        }
        const items = [...stockItems];
        items[editingIndex] = `${editUser.trim()} / ${editPass.trim()}`;
        rebuildSecretData(items);
        setEditingIndex(null);
        setEditUser("");
        setEditPass("");
        showSuccess("แก้ไขสำเร็จ");
    };

    const handleDeleteStock = (index: number) => {
        const items = stockItems.filter((_, i) => i !== index);
        rebuildSecretData(items);
        if (editingIndex === index) setEditingIndex(null);
        showSuccess("ลบสต็อกสำเร็จ");
    };

    // Live stock preview
    const stockItems = useMemo(() => {
        return splitStock(formData.secretData, formData.stockSeparator);
    }, [formData.secretData, formData.stockSeparator]);

    // Handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const uploadFormData = new FormData();
            uploadFormData.append("file", file);

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
        } catch {
            showError("เกิดข้อผิดพลาดในการอัพโหลด");
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

        // Validate required fields
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
        // Note: secretData is optional, can add stock later via stock management

        setIsLoading(true);

        try {
            const response = await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                showSuccess("🎉 สร้างสินค้าสำเร็จ! สินค้าถูกเพิ่มเข้าระบบเรียบร้อยแล้ว");
                router.push("/admin/products");
            } else {
                showError(`เกิดข้อผิดพลาด: ${data.message}`);
            }
        } catch (error) {
            showError("ไม่สามารถสร้างสินค้าได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link
                href="/admin/products"
                className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
                <ArrowLeft className="h-4 w-4" />
                กลับไปรายการสินค้า
            </Link>

            {/* Form - 2 Column Layout */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Product Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <Shield className="h-6 w-6 text-indigo-600" />
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
                                        step="0.01"
                                        value={formData.discountPrice}
                                        onChange={handleChange}
                                        className="border-red-200 focus:border-red-400"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        หากกรอกราคานี้ สินค้าจะแสดงใน "สินค้าลดราคา"
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
                                        {isUploading ? "กำลังอัพโหลด..." : "อัพโหลดจากเครื่อง"}
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
                                    <div className="mt-2 relative aspect-video rounded-lg overflow-hidden bg-slate-100 max-w-xs border">
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

                    {/* Right Column - Stock Management */}
                    <div className="space-y-6">
                        {/* Add Single Stock */}
                        <Card className="border-amber-200 bg-amber-50/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                                    <Package className="h-5 w-5" />
                                    เพิ่มสต็อก 1 รายการ
                                    {stockItems.length > 0 && (
                                        <Badge variant="secondary" className="ml-auto">
                                            {stockItems.length} รายการ
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-2">
                                    <Label htmlFor="singleUser">User *</Label>
                                    <Input
                                        id="singleUser"
                                        placeholder="เช่น username123"
                                        value={singleUser}
                                        onChange={(e) => setSingleUser(e.target.value)}
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
                                        className="font-mono"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    className="w-full gap-2"
                                    onClick={handleAddSingleStock}
                                >
                                    <Plus className="h-4 w-4" />
                                    เพิ่มสต็อก
                                </Button>
                                <p className="text-xs text-amber-600">
                                    ⚠️ แต่ละรายการจะถูกส่งให้ลูกค้าทีละ 1 ชิ้นเมื่อซื้อ
                                </p>
                            </CardContent>
                        </Card>

                        {/* Stock List */}
                        {stockItems.length > 0 && (
                            <Card className="border-blue-200 bg-blue-50/50">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2 text-blue-700">
                                        <Eye className="h-5 w-5" />
                                        รายการสต็อก
                                        <Badge variant="secondary" className="ml-auto">
                                            {stockItems.length} รายการ
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="max-h-64 overflow-y-auto space-y-2">
                                        {stockItems.map((item, index) => (
                                            <div
                                                key={index}
                                                className="rounded-lg border bg-white p-3 text-sm flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        #{index + 1}
                                                    </Badge>
                                                    <span className="font-mono text-xs truncate max-w-[200px]">
                                                        {item}
                                                    </span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-red-600"
                                                    onClick={() => handleDeleteStock(index)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Submit Button - Full Width */}
                <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isLoading}
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
            </form>
        </div>
    );
}
