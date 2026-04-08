"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { showSuccess, showError } from "@/lib/swal";
import { Save, Loader2, Dices, Coins, Timer, Layers, Plus, Trash2, Upload, ImageIcon, X, Pencil } from "lucide-react";
import Image from "next/image";
import { resizeFileToSquare } from "@/lib/imageResize";

interface GachaSettings {
    isEnabled: boolean;
    costType: string;
    costAmount: number;
    dailySpinLimit: number;
    tierMode: string;
}

type Tier = "common" | "rare" | "epic" | "legendary";
type RewardType = "PRODUCT" | "CREDIT" | "POINT" | "TICKET";

interface ProductOption {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    category: string;
}

interface RewardRow {
    id: string;
    rewardType: RewardType;
    productId: string | null;
    tier: Tier;
    isActive: boolean;
    rewardName: string | null;
    rewardAmount: number | null;
    rewardImageUrl: string | null;
    product: ProductOption | null;
}

export default function AdminGachaSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isRewardLoading, setIsRewardLoading] = useState(true);
    const [isAddingReward, setIsAddingReward] = useState(false);
    const [rewardRows, setRewardRows] = useState<RewardRow[]>([]);
    const [productOptions, setProductOptions] = useState<ProductOption[]>([]);

    // New reward form state
    const [newRewardType, setNewRewardType] = useState<RewardType>("PRODUCT");
    const [newRewardProductId, setNewRewardProductId] = useState<string>("");
    const [newRewardTier, setNewRewardTier] = useState<Tier>("common");
    const [newRewardName, setNewRewardName] = useState<string>("");
    const [newRewardAmount, setNewRewardAmount] = useState<number>(0);
    const [newRewardImageUrl, setNewRewardImageUrl] = useState<string>("");
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Edit image for existing rewards
    const [editingImageRewardId, setEditingImageRewardId] = useState<string | null>(null);
    const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    const [settings, setSettings] = useState<GachaSettings>({
        isEnabled: true,
        costType: "FREE",
        costAmount: 0,
        dailySpinLimit: 0,
        tierMode: "PRICE",
    });

    useEffect(() => {
        fetchSettings();
        fetchRewards();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/admin/gacha-settings");
            const data = await res.json();
            if (data.success && data.data) {
                setSettings({
                    isEnabled: data.data.isEnabled ?? true,
                    costType: data.data.costType ?? "FREE",
                    costAmount: Number(data.data.costAmount) || 0,
                    dailySpinLimit: data.data.dailySpinLimit ?? 0,
                    tierMode: data.data.tierMode ?? "PRICE",
                });
            }
        } catch {
            showError("ไม่สามารถโหลดการตั้งค่ากาชาได้");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRewards = async () => {
        setIsRewardLoading(true);
        try {
            const [productsRes, rewardsRes] = await Promise.all([
                fetch("/api/admin/gacha-products"),
                fetch("/api/admin/gacha-rewards"),
            ]);

            const productsData = await productsRes.json();
            const rewardsData = await rewardsRes.json();

            if (productsRes.ok && productsData.success) {
                setProductOptions(productsData.data || []);
            }

            if (rewardsRes.ok && rewardsData.success) {
                setRewardRows(rewardsData.data || []);
            }
        } catch {
            showError("ไม่สามารถโหลดรายการรางวัลกาชาได้");
        } finally {
            setIsRewardLoading(false);
        }
    };

    const handleUploadImage = async (file: File) => {
        setIsUploadingImage(true);
        try {
            // Auto-resize to 400×400 square WebP before upload
            const resized = await resizeFileToSquare(file, 400);
            const formData = new FormData();
            formData.append("file", resized);
            const res = await fetch("/api/admin/gacha-rewards/upload-image", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                showError(data.message || "อัปโหลดรูปภาพไม่สำเร็จ");
                return;
            }
            setNewRewardImageUrl(data.url);
        } catch {
            showError("อัปโหลดรูปภาพไม่สำเร็จ");
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleAddReward = async () => {
        if (newRewardType === "PRODUCT" && !newRewardProductId) {
            showError("กรุณาเลือกสินค้า");
            return;
        }
        if (newRewardType !== "PRODUCT" && !newRewardName.trim()) {
            showError("กรุณากรอกชื่อรางวัล");
            return;
        }
        if (newRewardType !== "PRODUCT" && newRewardAmount <= 0) {
            showError("กรุณากรอกจำนวนรางวัล (ต้องมากกว่า 0)");
            return;
        }

        setIsAddingReward(true);
        try {
            const body =
                newRewardType === "PRODUCT"
                    ? { rewardType: "PRODUCT", productId: newRewardProductId, tier: newRewardTier, isActive: true }
                    : {
                        rewardType: newRewardType,
                        rewardName: newRewardName,
                        rewardAmount: newRewardAmount,
                        rewardImageUrl: newRewardImageUrl || null,
                        tier: newRewardTier,
                        isActive: true,
                    };

            const res = await fetch("/api/admin/gacha-rewards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                showError(data.message || "เพิ่มรางวัลไม่สำเร็จ");
                return;
            }

            showSuccess("เพิ่มรางวัลเข้ากาชาแล้ว");
            // Reset form
            setNewRewardProductId("");
            setNewRewardTier("common");
            setNewRewardName("");
            setNewRewardAmount(0);
            setNewRewardImageUrl("");
            await fetchRewards();
        } catch {
            showError("เพิ่มรางวัลไม่สำเร็จ");
        } finally {
            setIsAddingReward(false);
        }
    };

    const handleUploadEditImage = async (file: File, rewardId: string) => {
        setIsUploadingEditImage(true);
        try {
            // Auto-resize to 400×400 square WebP before upload
            const resized = await resizeFileToSquare(file, 400);
            const formData = new FormData();
            formData.append("file", resized);
            const res = await fetch("/api/admin/gacha-rewards/upload-image", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                showError(data.message || "อัปโหลดรูปภาพไม่สำเร็จ");
                return;
            }
            // Update the reward with new image URL
            await handleUpdateReward(rewardId, { rewardImageUrl: data.url } as Parameters<typeof handleUpdateReward>[1]);
        } catch {
            showError("อัปโหลดรูปภาพไม่สำเร็จ");
        } finally {
            setIsUploadingEditImage(false);
            setEditingImageRewardId(null);
        }
    };

    const handleUpdateReward = async (id: string, patch: Partial<Pick<RewardRow, "tier" | "isActive"> & { rewardImageUrl?: string }>) => {
        try {
            const res = await fetch(`/api/admin/gacha-rewards/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                showError(data.message || "อัปเดตไม่สำเร็จ");
                return;
            }
            await fetchRewards();
        } catch {
            showError("อัปเดตไม่สำเร็จ");
        }
    };

    const handleDeleteReward = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/gacha-rewards/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok || !data.success) {
                showError(data.message || "ลบไม่สำเร็จ");
                return;
            }
            showSuccess("ลบรางวัลออกจากกาชาแล้ว");
            await fetchRewards();
        } catch {
            showError("ลบไม่สำเร็จ");
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/admin/gacha-settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            const data = await res.json();
            if (data.success) {
                showSuccess("บันทึกการตั้งค่ากาชาสำเร็จ");
            } else {
                showError(data.message || "เกิดข้อผิดพลาด");
            }
        } catch {
            showError("ไม่สามารถบันทึกได้");
        } finally {
            setIsSaving(false);
        }
    };

    const rewardTypeBadge = (type: RewardType) => {
        if (type === "CREDIT") return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">💰 เครดิต</Badge>;
        if (type === "POINT") return <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">💎 พอยต์</Badge>;
        if (type === "TICKET") return <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">🎟 ตั๋วสุ่ม</Badge>;
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">🎁 สินค้า</Badge>;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-page-enter">
            {/* Header */}
            <div className="sticky top-0 z-20 -mx-4 border-b bg-background/85 px-4 backdrop-blur sm:-mx-6 sm:px-6">
                <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Dices className="h-7 w-7 text-primary" />
                            ตั้งค่ากาชา
                        </h1>
                        <p className="text-muted-foreground">จัดการระบบสุ่มไอเท็ม Gacha Rhombus Grid</p>
                    </div>
                    <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        บันทึก
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* เปิด/ปิดระบบ */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Dices className="h-5 w-5" />
                            สถานะระบบ
                        </CardTitle>
                        <CardDescription>เปิดหรือปิดระบบกาชาทั้งหมด</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base font-medium">เปิดใช้งานระบบกาชา</Label>
                                <p className="text-sm text-muted-foreground">
                                    {settings.isEnabled ? "ระบบเปิดอยู่ — ผู้ใช้สามารถสุ่มได้" : "ระบบปิดอยู่ — ผู้ใช้ไม่สามารถสุ่มได้"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={settings.isEnabled ? "default" : "secondary"}>
                                    {settings.isEnabled ? "เปิด" : "ปิด"}
                                </Badge>
                                <Switch
                                    checked={settings.isEnabled}
                                    onCheckedChange={(checked) =>
                                        setSettings((prev) => ({ ...prev, isEnabled: checked }))
                                    }
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ค่าสุ่ม */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Coins className="h-5 w-5" />
                            ค่าสุ่ม
                        </CardTitle>
                        <CardDescription>กำหนดว่าผู้ใช้ต้องจ่ายอะไรเพื่อสุ่ม</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>ประเภทค่าสุ่ม</Label>
                            <Select
                                value={settings.costType}
                                onValueChange={(value) =>
                                    setSettings((prev) => ({ ...prev, costType: value }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FREE">🎉 ฟรี (ไม่มีค่าใช้จ่าย)</SelectItem>
                                    <SelectItem value="CREDIT">💰 เครดิต (หักจากยอดเงิน)</SelectItem>
                                    <SelectItem value="POINT">💎 พอยต์ (หักจากพอยต์)</SelectItem>
                                    <SelectItem value="TICKET">🎟 ตั๋วสุ่ม (หักจากตั๋ว)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {settings.costType !== "FREE" && (
                            <div className="space-y-2">
                                <Label>
                                    ราคาต่อครั้ง ({settings.costType === "CREDIT" ? "฿" : settings.costType === "POINT" ? "พอยต์" : "ตั๋ว"})
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={settings.costAmount}
                                    onChange={(e) =>
                                        setSettings((prev) => ({
                                            ...prev,
                                            costAmount: Number(e.target.value) || 0,
                                        }))
                                    }
                                    placeholder="0"
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* จำกัดรอบ */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Timer className="h-5 w-5" />
                            จำกัดรอบ
                        </CardTitle>
                        <CardDescription>กำหนดจำนวนครั้งที่สุ่มได้ต่อวัน</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Label>จำนวนครั้ง/วัน (0 = ไม่จำกัด)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={settings.dailySpinLimit}
                            onChange={(e) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    dailySpinLimit: Number(e.target.value) || 0,
                                }))
                            }
                            placeholder="0"
                        />
                        <p className="text-sm text-muted-foreground">
                            {settings.dailySpinLimit === 0
                                ? "ผู้ใช้สามารถสุ่มได้ไม่จำกัดจำนวนครั้ง"
                                : `ผู้ใช้สุ่มได้สูงสุด ${settings.dailySpinLimit} ครั้ง/วัน`}
                        </p>
                    </CardContent>
                </Card>

                {/* วิธีจัดเทียร์ */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Layers className="h-5 w-5" />
                            วิธีจัดเทียร์
                        </CardTitle>
                        <CardDescription>เลือกวิธีการจัดสินค้าเข้าเทียร์ในกริดกาชา</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Label>โหมดจัดเทียร์</Label>
                        <Select
                            value={settings.tierMode}
                            onValueChange={(value) =>
                                setSettings((prev) => ({ ...prev, tierMode: value }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PRICE">📊 ตามราคา (แพงสุด = Legendary)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            Legendary (1 ชิ้น) → Epic (3 ชิ้น) → Rare (5 ชิ้น) → Common (8 ชิ้น)
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Reward Management */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Dices className="h-5 w-5" />
                        จัดการรางวัลกาชา
                    </CardTitle>
                    <CardDescription>เพิ่มรางวัลแบบสินค้า, เครดิต หรือพอยต์ พร้อมอัปโหลดรูปภาพ</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* ประเภทรางวัล */}
                    <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                        <div className="grid gap-4 md:grid-cols-4">
                            {/* ประเภท */}
                            <div className="space-y-2">
                                <Label>ประเภทรางวัล</Label>
                                <Select value={newRewardType} onValueChange={(v) => setNewRewardType(v as RewardType)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PRODUCT">🎁 สินค้า</SelectItem>
                                        <SelectItem value="CREDIT">💰 เครดิต</SelectItem>
                                        <SelectItem value="POINT">💎 พอยต์</SelectItem>
                                        <SelectItem value="TICKET">🎟 ตั๋วสุ่ม</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Tier */}
                            <div className="space-y-2">
                                <Label>Tier</Label>
                                <Select value={newRewardTier} onValueChange={(v) => setNewRewardTier(v as Tier)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="common">🟠 ธรรมดา</SelectItem>
                                        <SelectItem value="rare">🟢 หายาก</SelectItem>
                                        <SelectItem value="epic">🔵 หายากมาก</SelectItem>
                                        <SelectItem value="legendary">🔴 ตำนาน</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* เลือกสินค้า (PRODUCT only) */}
                            {newRewardType === "PRODUCT" && (
                                <div className="space-y-2 md:col-span-2">
                                    <Label>เลือกสินค้า</Label>
                                    <Select value={newRewardProductId} onValueChange={setNewRewardProductId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="เลือกสินค้า..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {productOptions.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name} — ฿{p.price.toLocaleString()}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* CREDIT / POINT / TICKET fields */}
                            {newRewardType !== "PRODUCT" && (
                                <>
                                    <div className="space-y-2">
                                        <Label>ชื่อรางวัล</Label>
                                        <Input
                                            value={newRewardName}
                                            onChange={(e) => setNewRewardName(e.target.value)}
                                            placeholder={newRewardType === "CREDIT" ? "เช่น เครดิต 50 บาท" : newRewardType === "POINT" ? "เช่น พอยต์ 100 แต้ม" : "เช่น ตั๋วสุ่ม 3 ใบ"}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>จำนวน ({newRewardType === "CREDIT" ? "฿" : newRewardType === "POINT" ? "พอยต์" : "ตั๋ว"})</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={newRewardAmount || ""}
                                            onChange={(e) => setNewRewardAmount(Number(e.target.value) || 0)}
                                            placeholder="0"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Image upload (currency rewards only) */}
                        {newRewardType !== "PRODUCT" && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>รูปภาพรางวัล (ไม่บังคับ)</Label>
                                    <span className="text-xs text-muted-foreground">
                                        ✨ อัปโหลดรูปขนาดไหนก็ได้ — ระบบปรับให้อัตโนมัติ
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUploadImage(file);
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="gap-2"
                                        disabled={isUploadingImage}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {isUploadingImage ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Upload className="h-4 w-4" />
                                        )}
                                        {isUploadingImage ? "กำลังอัปโหลด..." : "เลือกรูปภาพ"}
                                    </Button>

                                    {newRewardImageUrl && (
                                        <div className="relative flex-shrink-0">
                                            <div className="h-14 w-14 rounded-lg border overflow-hidden">
                                                <Image
                                                    src={newRewardImageUrl}
                                                    alt="reward preview"
                                                    width={56}
                                                    height={56}
                                                    className="object-cover w-full h-full"
                                                />
                                            </div>
                                            <button
                                                onClick={() => setNewRewardImageUrl("")}
                                                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center"
                                            >
                                                <X className="h-2.5 w-2.5" />
                                            </button>
                                        </div>
                                    )}

                                    {!newRewardImageUrl && (
                                        <div className="h-14 w-14 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground">
                                            <ImageIcon className="h-5 w-5" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button onClick={handleAddReward} disabled={isAddingReward} className="gap-2">
                                {isAddingReward ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                เพิ่มรางวัล
                            </Button>
                        </div>
                    </div>

                    {/* Hidden file input for editing existing reward image */}
                    <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const file = e.target.files?.[0];
                            if (file && editingImageRewardId) {
                                handleUploadEditImage(file, editingImageRewardId);
                            }
                            e.target.value = "";
                        }}
                    />

                    {/* Table */}
                    {isRewardLoading && (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    )}
                    {!isRewardLoading && rewardRows.length === 0 && (
                        <div className="text-center py-10 rounded-xl border bg-muted/20">
                            <p className="text-muted-foreground">ยังไม่มีรางวัลในกาชา</p>
                        </div>
                    )}
                    {!isRewardLoading && rewardRows.length > 0 && (
                        <>
                        <div className="space-y-3 md:hidden">
                            {rewardRows.map((r) => {
                                const imgSrc =
                                    r.rewardType === "PRODUCT"
                                        ? r.product?.imageUrl
                                        : r.rewardImageUrl;
                                const canEditImage = r.rewardType !== "PRODUCT";

                                let rewardSubtext = "";
                                if (r.rewardType === "PRODUCT" && r.product) {
                                    rewardSubtext = `฿${r.product.price.toLocaleString()} • ${r.product.category}`;
                                } else if (r.rewardAmount != null) {
                                    let prefix = "";
                                    let suffix = "";
                                    if (r.rewardType === "CREDIT") prefix = "฿";
                                    if (r.rewardType === "POINT") suffix = " พอยต์";
                                    if (r.rewardType === "TICKET") suffix = " ตั๋วสุ่ม";
                                    rewardSubtext = `${prefix}${r.rewardAmount.toLocaleString()}${suffix}`;
                                }

                                return (
                                    <div key={r.id} className="rounded-xl border border-border p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="h-10 w-10 rounded-md border overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
                                                    {imgSrc ? (
                                                        <Image
                                                            src={imgSrc}
                                                            alt="reward"
                                                            width={40}
                                                            height={40}
                                                            className="object-contain w-full h-full"
                                                        />
                                                    ) : (
                                                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-foreground">
                                                        {r.rewardType === "PRODUCT"
                                                            ? r.product?.name || "(ไม่พบสินค้า)"
                                                            : r.rewardName || "-"}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {rewardSubtext}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-600"
                                                onClick={() => handleDeleteReward(r.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="mt-3">{rewardTypeBadge(r.rewardType)}</div>

                                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">Tier</Label>
                                                <Select value={r.tier} onValueChange={(v) => handleUpdateReward(r.id, { tier: v as Tier })}>
                                                    <SelectTrigger className="h-9 w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="common">🟠 common</SelectItem>
                                                        <SelectItem value="rare">🟢 rare</SelectItem>
                                                        <SelectItem value="epic">🔵 epic</SelectItem>
                                                        <SelectItem value="legendary">🔴 legendary</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">สถานะ</Label>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={r.isActive}
                                                        onCheckedChange={(checked) => handleUpdateReward(r.id, { isActive: checked })}
                                                    />
                                                    <Badge variant={r.isActive ? "default" : "secondary"}>
                                                        {r.isActive ? "เปิด" : "ปิด"}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        {canEditImage ? (
                                            <div className="mt-3">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2"
                                                    disabled={isUploadingEditImage && editingImageRewardId === r.id}
                                                    onClick={() => {
                                                        setEditingImageRewardId(r.id);
                                                        editFileInputRef.current?.click();
                                                    }}
                                                >
                                                    {isUploadingEditImage && editingImageRewardId === r.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    )}
                                                    แก้ไขรูปภาพ
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
                                    <TableHead>รูป</TableHead>
                                    <TableHead>รางวัล</TableHead>
                                    <TableHead>ประเภท</TableHead>
                                    <TableHead>Tier</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead className="text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rewardRows.map((r) => {
                                    const imgSrc =
                                        r.rewardType === "PRODUCT"
                                            ? r.product?.imageUrl
                                            : r.rewardImageUrl;
                                    const canEditImage = r.rewardType !== "PRODUCT";

                                    let rewardSubtext = "";
                                    if (r.rewardType === "PRODUCT" && r.product) {
                                        rewardSubtext = `฿${r.product.price.toLocaleString()} • ${r.product.category}`;
                                    } else if (r.rewardAmount != null) {
                                        let prefix = "";
                                        let suffix = "";
                                        if (r.rewardType === "CREDIT") prefix = "฿";
                                        if (r.rewardType === "POINT") suffix = " พอยต์";
                                        if (r.rewardType === "TICKET") suffix = " ตั๋วสุ่ม";
                                        rewardSubtext = `${prefix}${r.rewardAmount.toLocaleString()}${suffix}`;
                                    }

                                    return (
                                        <TableRow key={r.id}>
                                            {/* รูป */}
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="h-10 w-10 rounded-md border overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
                                                        {imgSrc ? (
                                                            <Image
                                                                src={imgSrc}
                                                                alt="reward"
                                                                width={40}
                                                                height={40}
                                                                className="object-contain w-full h-full"
                                                            />
                                                        ) : (
                                                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    {canEditImage && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                            disabled={isUploadingEditImage && editingImageRewardId === r.id}
                                                            title="แก้ไขรูปภาพ"
                                                            onClick={() => {
                                                                setEditingImageRewardId(r.id);
                                                                editFileInputRef.current?.click();
                                                            }}
                                                        >
                                                            {isUploadingEditImage && editingImageRewardId === r.id ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* ชื่อรางวัล */}
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-foreground">
                                                        {r.rewardType === "PRODUCT"
                                                            ? r.product?.name || "(ไม่พบสินค้า)"
                                                            : r.rewardName || "-"}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {rewardSubtext}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* badge ประเภท */}
                                            <TableCell>{rewardTypeBadge(r.rewardType)}</TableCell>

                                            {/* Tier */}
                                            <TableCell>
                                                <Select value={r.tier} onValueChange={(v) => handleUpdateReward(r.id, { tier: v as Tier })}>
                                                    <SelectTrigger className="h-9 w-32">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="common">🟠 common</SelectItem>
                                                        <SelectItem value="rare">🟢 rare</SelectItem>
                                                        <SelectItem value="epic">🔵 epic</SelectItem>
                                                        <SelectItem value="legendary">🔴 legendary</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>

                                            {/* สถานะ */}
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={r.isActive}
                                                        onCheckedChange={(checked) => handleUpdateReward(r.id, { isActive: checked })}
                                                    />
                                                    <Badge variant={r.isActive ? "default" : "secondary"}>
                                                        {r.isActive ? "เปิด" : "ปิด"}
                                                    </Badge>
                                                </div>
                                            </TableCell>

                                            {/* ลบ */}
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-600"
                                                    onClick={() => handleDeleteReward(r.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Save button bottom */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} size="lg" className="gap-2">
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    บันทึกการตั้งค่า
                </Button>
            </div>
        </div>
    );
}
