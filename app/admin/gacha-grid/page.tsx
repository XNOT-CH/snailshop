"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { showSuccess, showError } from "@/lib/swal";
import { Loader2, Grid3X3, Plus, Trash2, Upload, ImageIcon, Pencil, X } from "lucide-react";
import Image from "next/image";
import { resizeFileToSquare } from "@/lib/imageResize";

type Tier = "common" | "rare" | "epic" | "legendary";
type RewardType = "CREDIT" | "POINT";

interface RewardRow {
    id: string;
    rewardType: RewardType;
    tier: Tier;
    isActive: boolean;
    rewardName: string | null;
    rewardAmount: number | null;
    rewardImageUrl: string | null;
}

const TIER_LABEL: Record<Tier, string> = {
    common: "🟠 ธรรมดา",
    rare: "🟢 หายาก",
    epic: "🔵 หายากมาก",
    legendary: "🔴 ตำนาน",
};

export default function AdminGachaGridPage() {
    const [rewards, setRewards] = useState<RewardRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // New reward form
    const [newType, setNewType] = useState<RewardType>("CREDIT");
    const [newTier, setNewTier] = useState<Tier>("common");
    const [newName, setNewName] = useState("");
    const [newAmount, setNewAmount] = useState<number>(0);
    const [newImageUrl, setNewImageUrl] = useState("");
    const [isUploadingNew, setIsUploadingNew] = useState(false);
    const newFileRef = useRef<HTMLInputElement>(null);

    // Edit image
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isUploadingEdit, setIsUploadingEdit] = useState(false);
    const editFileRef = useRef<HTMLInputElement>(null);

    const fetchRewards = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/gacha-rewards");
            const data = await res.json();
            if (data.success) {
                // Grid machine uses gachaMachineId = null and rewardType != PRODUCT
                const gridRewards: RewardRow[] = (data.data ?? []).filter(
                    (r: RewardRow & { rewardType: string }) =>
                        r.rewardType === "CREDIT" || r.rewardType === "POINT"
                );
                setRewards(gridRewards);
            }
        } catch {
            showError("ไม่สามารถโหลดข้อมูลรางวัลได้");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { void fetchRewards(); }, []);

    const uploadImage = async (file: File): Promise<string | null> => {
        const resized = await resizeFileToSquare(file, 400);
        const formData = new FormData();
        formData.append("file", resized);
        const res = await fetch("/api/admin/gacha-rewards/upload-image", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok || !data.success) { showError(data.message || "อัปโหลดรูปภาพไม่สำเร็จ"); return null; }
        return data.url as string;
    };

    const handleUploadNew = async (file: File) => {
        setIsUploadingNew(true);
        try {
            const url = await uploadImage(file);
            if (url) setNewImageUrl(url);
        } finally { setIsUploadingNew(false); }
    };

    const handleUploadEdit = async (file: File, rewardId: string) => {
        setIsUploadingEdit(true);
        try {
            const url = await uploadImage(file);
            if (!url) return;
            const res = await fetch(`/api/admin/gacha-rewards/${rewardId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rewardImageUrl: url }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) { showError(data.message || "อัปเดตรูปภาพไม่สำเร็จ"); return; }
            await fetchRewards();
        } finally { setIsUploadingEdit(false); setEditingId(null); }
    };

    const handleAdd = async () => {
        if (!newName.trim()) { showError("กรุณากรอกชื่อรางวัล"); return; }
        if (newAmount <= 0) { showError("กรุณากรอกจำนวนรางวัล (ต้องมากกว่า 0)"); return; }
        setIsAdding(true);
        try {
            const res = await fetch("/api/admin/gacha-rewards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rewardType: newType,
                    rewardName: newName,
                    rewardAmount: newAmount,
                    rewardImageUrl: newImageUrl || null,
                    tier: newTier,
                    isActive: true,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) { showError(data.message || "เพิ่มรางวัลไม่สำเร็จ"); return; }
            showSuccess("เพิ่มรางวัลสำเร็จ");
            setNewName(""); setNewAmount(0); setNewImageUrl("");
            await fetchRewards();
        } catch { showError("เพิ่มรางวัลไม่สำเร็จ"); }
        finally { setIsAdding(false); }
    };

    const handleUpdate = async (id: string, patch: Partial<RewardRow>) => {
        const res = await fetch(`/api/admin/gacha-rewards/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
        });
        const data = await res.json();
        if (!res.ok || !data.success) { showError(data.message || "อัปเดตไม่สำเร็จ"); return; }
        await fetchRewards();
    };

    const handleDelete = async (id: string) => {
        const res = await fetch(`/api/admin/gacha-rewards/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok || !data.success) { showError(data.message || "ลบไม่สำเร็จ"); return; }
        showSuccess("ลบรางวัลแล้ว");
        await fetchRewards();
    };

    return (
        <div className="space-y-8 animate-page-enter">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Grid3X3 className="h-7 w-7 text-primary" />
                        จัดการรางวัล สุ่มกงล้อ (3×3)
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        เพิ่ม/แก้ไข/ลบรางวัลในระบบสุ่มกงล้อ พร้อมอัปโหลดรูปภาพ
                    </p>
                </div>
            </div>

            {/* Add Reward Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Plus className="h-5 w-5" /> เพิ่มรางวัลใหม่
                    </CardTitle>
                    <CardDescription>รางวัลประเภท เครดิต หรือ พอยต์ พร้อมรูปภาพ</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                        {/* type */}
                        <div className="space-y-2">
                            <Label>ประเภทรางวัล</Label>
                            <Select value={newType} onValueChange={(v) => setNewType(v as RewardType)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CREDIT">💰 เครดิต</SelectItem>
                                    <SelectItem value="POINT">💎 พอยต์</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* tier */}
                        <div className="space-y-2">
                            <Label>Tier</Label>
                            <Select value={newTier} onValueChange={(v) => setNewTier(v as Tier)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="common">🟠 ธรรมดา</SelectItem>
                                    <SelectItem value="rare">🟢 หายาก</SelectItem>
                                    <SelectItem value="epic">🔵 หายากมาก</SelectItem>
                                    <SelectItem value="legendary">🔴 ตำนาน</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* name */}
                        <div className="space-y-2">
                            <Label>ชื่อรางวัล</Label>
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder={newType === "CREDIT" ? "เช่น เครดิต 50 บาท" : "เช่น พอยต์ 100 แต้ม"}
                            />
                        </div>

                        {/* amount */}
                        <div className="space-y-2">
                            <Label>จำนวน ({newType === "CREDIT" ? "฿" : "พอยต์"})</Label>
                            <Input
                                type="number"
                                min={1}
                                value={newAmount || ""}
                                onChange={(e) => setNewAmount(Number(e.target.value) || 0)}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* image upload */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>รูปภาพรางวัล (ไม่บังคับ)</Label>
                            <span className="text-xs text-muted-foreground">✨ ปรับขนาดอัตโนมัติ</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                ref={newFileRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUploadNew(f); }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                className="gap-2"
                                disabled={isUploadingNew}
                                onClick={() => newFileRef.current?.click()}
                            >
                                {isUploadingNew ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                {isUploadingNew ? "กำลังอัปโหลด..." : "เลือกรูปภาพ"}
                            </Button>

                            {newImageUrl ? (
                                <div className="relative flex-shrink-0">
                                    <div className="h-14 w-14 rounded-lg border overflow-hidden">
                                        <Image src={newImageUrl} alt="preview" width={56} height={56} className="object-cover w-full h-full" />
                                    </div>
                                    <button
                                        onClick={() => setNewImageUrl("")}
                                        className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center"
                                    >
                                        <X className="h-2.5 w-2.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="h-14 w-14 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground">
                                    <ImageIcon className="h-5 w-5" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={() => void handleAdd()} disabled={isAdding} className="gap-2">
                            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            เพิ่มรางวัล
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Hidden edit file input */}
            <input
                ref={editFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && editingId) void handleUploadEdit(f, editingId);
                    if (e.target) e.target.value = "";
                }}
            />

            {/* Reward Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Grid3X3 className="h-5 w-5" />
                        รายการรางวัล ({rewards.length} รายการ)
                    </CardTitle>
                    <CardDescription>ตารางแสดงรางวัลทั้งหมดในสุ่มกงล้อ</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-7 w-7 animate-spin text-primary" />
                        </div>
                    ) : rewards.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Grid3X3 className="h-10 w-10 mx-auto opacity-20 mb-2" />
                            <p className="text-sm">ยังไม่มีรางวัล — เพิ่มรางวัลด้านบน</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>รูป</TableHead>
                                    <TableHead>ชื่อรางวัล</TableHead>
                                    <TableHead>ประเภท</TableHead>
                                    <TableHead>Tier</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead className="text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rewards.map((r) => (
                                    <TableRow key={r.id}>
                                        {/* รูป */}
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <div className="h-10 w-10 rounded-md border overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
                                                    {r.rewardImageUrl ? (
                                                        <Image
                                                            src={r.rewardImageUrl}
                                                            alt="reward"
                                                            width={40}
                                                            height={40}
                                                            className="object-contain w-full h-full"
                                                        />
                                                    ) : (
                                                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                    disabled={isUploadingEdit && editingId === r.id}
                                                    title="แก้ไขรูปภาพ"
                                                    onClick={() => {
                                                        setEditingId(r.id);
                                                        editFileRef.current?.click();
                                                    }}
                                                >
                                                    {isUploadingEdit && editingId === r.id
                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        : <Pencil className="h-3.5 w-3.5" />}
                                                </Button>
                                            </div>
                                        </TableCell>

                                        {/* ชื่อ */}
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{r.rewardName || "-"}</span>
                                                {r.rewardAmount != null && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {r.rewardType === "CREDIT" ? "฿" : ""}{r.rewardAmount.toLocaleString()}{r.rewardType === "POINT" ? " พอยต์" : ""}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* ประเภท */}
                                        <TableCell>
                                            {r.rewardType === "CREDIT"
                                                ? <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">💰 เครดิต</Badge>
                                                : <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">💎 พอยต์</Badge>}
                                        </TableCell>

                                        {/* Tier */}
                                        <TableCell>
                                            <Select
                                                value={r.tier}
                                                onValueChange={(v) => void handleUpdate(r.id, { tier: v as Tier })}
                                            >
                                                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
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
                                                    onCheckedChange={(checked) => void handleUpdate(r.id, { isActive: checked })}
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
                                                onClick={() => void handleDelete(r.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
