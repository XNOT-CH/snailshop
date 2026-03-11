"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from "@/lib/swal";
import { compressImage } from "@/lib/compressImage";
import { Save, Loader2, Image as ImageIcon, Type, Megaphone, Wallpaper, LayoutGrid, Upload, X } from "lucide-react";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";

interface SiteSettings {
    heroTitle: string;
    heroDescription: string;
    announcement: string;
    bannerImage1: string;
    bannerTitle1: string;
    bannerSubtitle1: string;
    bannerImage2: string;
    bannerTitle2: string;
    bannerSubtitle2: string;
    bannerImage3: string;
    bannerTitle3: string;
    bannerSubtitle3: string;
    logoUrl: string;
    backgroundImage: string;
    backgroundBlur: boolean;
    showAllProducts: boolean;
}

export default function AdminSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingBg, setIsUploadingBg] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);
    const [settings, setSettings] = useState<SiteSettings>({
        heroTitle: "",
        heroDescription: "",
        announcement: "",
        bannerImage1: "",
        bannerTitle1: "",
        bannerSubtitle1: "",
        bannerImage2: "",
        bannerTitle2: "",
        bannerSubtitle2: "",
        bannerImage3: "",
        bannerTitle3: "",
        bannerSubtitle3: "",
        logoUrl: "",
        backgroundImage: "",
        backgroundBlur: true,
        showAllProducts: true,
    });

    // Fetch settings on mount
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/admin/settings");
            const data = await res.json();
            if (data.success && data.data) {
                setSettings({
                    heroTitle: data.data.heroTitle || "",
                    heroDescription: data.data.heroDescription || "",
                    announcement: data.data.announcement || "",
                    bannerImage1: data.data.bannerImage1 || "",
                    bannerTitle1: data.data.bannerTitle1 || "",
                    bannerSubtitle1: data.data.bannerSubtitle1 || "",
                    bannerImage2: data.data.bannerImage2 || "",
                    bannerTitle2: data.data.bannerTitle2 || "",
                    bannerSubtitle2: data.data.bannerSubtitle2 || "",
                    bannerImage3: data.data.bannerImage3 || "",
                    bannerTitle3: data.data.bannerTitle3 || "",
                    bannerSubtitle3: data.data.bannerSubtitle3 || "",
                    logoUrl: data.data.logoUrl || "",
                    backgroundImage: data.data.backgroundImage || "",
                    backgroundBlur: data.data.backgroundBlur ?? true,
                    showAllProducts: data.data.showAllProducts ?? true,
                });
            }
        } catch (error) {
            showError("ไม่สามารถโหลดการตั้งค่าได้");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/admin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            const data = await res.json();

            if (data.success) {
                showSuccess("บันทึกการตั้งค่าสำเร็จ");
            } else {
                showError(data.message || "เกิดข้อผิดพลาด");
            }
        } catch (error) {
            showError("ไม่สามารถบันทึกได้");
        } finally {
            setIsSaving(false);
        }
    };

    const updateSetting = (key: keyof SiteSettings, value: string | boolean) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    // Handle file upload for logo
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingLogo(true);
        try {
            const compressed = await compressImage(file);
            const formData = new FormData();
            formData.append("file", compressed);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                updateSetting("logoUrl", data.url);
                showSuccess("อัพโหลดโลโก้สำเร็จ!");
            } else {
                showError(data.message || "อัพโหลดไม่สำเร็จ");
            }
        } catch (error) {
            showError(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัพโหลด");
        } finally {
            setIsUploadingLogo(false);
        }
    };

    // Handle file upload for background
    const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingBg(true);
        try {
            const compressed = await compressImage(file);
            const formData = new FormData();
            formData.append("file", compressed);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                updateSetting("backgroundImage", data.url);
                showSuccess("อัพโหลดรูปพื้นหลังสำเร็จ!");
            } else {
                showError(data.message || "อัพโหลดไม่สำเร็จ");
            }
        } catch (error) {
            showError(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัพโหลด");
        } finally {
            setIsUploadingBg(false);
        }
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
            <div className="sticky top-0 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 bg-background/85 backdrop-blur border-b">
                <div className="flex items-center justify-between py-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">ตั้งค่าเว็บไซต์</h1>
                        <p className="text-muted-foreground">จัดการรูปภาพและข้อความบนเว็บไซต์</p>
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

            <div className="grid gap-6 xl:grid-cols-12">
                <div className="space-y-6 xl:col-span-5">
                    {/* Homepage Section Toggles */}
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                            <div className="w-6 h-6 bg-[#1a56db] rounded flex items-center justify-center">
                                <LayoutGrid className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="font-bold">ส่วนแสดงผลหน้าแรก</span>
                            <span className="text-sm text-muted-foreground ml-1">— เปิด/ปิดส่วนต่างๆ ที่แสดงบนหน้าแรก</span>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center justify-between rounded-xl border border-border p-4 bg-gray-50 dark:bg-zinc-800">
                                <div>
                                    <p className="font-medium text-sm">สินค้าทั้งหมด</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">แสดงรายการสินค้าทั้งหมดบนหน้าแรก</p>
                                </div>
                                <Switch
                                    checked={settings.showAllProducts}
                                    onCheckedChange={(checked) => updateSetting("showAllProducts", checked)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* General Settings */}
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                            <div className="w-6 h-6 bg-[#1a56db] rounded flex items-center justify-center">
                                <Type className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="font-bold">ข้อความทั่วไป</span>
                        </div>
                        <div className="p-5 grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>ชื่อเว็บไซต์</Label>
                                <Input
                                    value={settings.heroTitle}
                                    onChange={(e) => updateSetting("heroTitle", e.target.value)}
                                    placeholder="GameStore"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>คำอธิบาย</Label>
                                <Input
                                    value={settings.heroDescription}
                                    onChange={(e) => updateSetting("heroDescription", e.target.value)}
                                    placeholder="Game ID Marketplace"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label className="flex items-center gap-2">
                                    <Megaphone className="h-4 w-4" />
                                    ประกาศ (แสดงด้านบนเว็บ)
                                </Label>
                                <Textarea
                                    value={settings.announcement}
                                    onChange={(e) => updateSetting("announcement", e.target.value)}
                                    placeholder="ข้อความประกาศ..."
                                    rows={2}
                                />
                            </div>
                            <div className="space-y-3">
                                <Label>โลโก้</Label>

                                <div className="grid gap-4 lg:grid-cols-2">
                                    <div className="space-y-3">
                                        {/* File Upload */}
                                        <div className="flex gap-2">
                                            <input
                                                ref={logoInputRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                                                className="hidden"
                                                onChange={handleLogoUpload}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => logoInputRef.current?.click()}
                                                disabled={isUploadingLogo}
                                            >
                                                {isUploadingLogo ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Upload className="h-4 w-4" />
                                                )}
                                                {isUploadingLogo ? "กำลังปรับปรุงภาพ..." : "อัพโหลด"}
                                            </Button>
                                            <span className="text-sm text-muted-foreground self-center">หรือ</span>
                                        </div>

                                        {/* URL Input */}
                                        <div className="flex gap-2">
                                            <Input
                                                value={settings.logoUrl}
                                                onChange={(e) => updateSetting("logoUrl", e.target.value)}
                                                placeholder="วาง URL โลโก้..."
                                                className="flex-1"
                                            />
                                            {settings.logoUrl && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => updateSetting("logoUrl", "")}
                                                    className="text-red-500 hover:text-red-600"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        {settings.logoUrl ? (
                                            <div className="p-4 bg-muted rounded-lg border h-full flex items-center justify-center">
                                                <Image
                                                    src={settings.logoUrl}
                                                    alt="Logo Preview"
                                                    width={160}
                                                    height={60}
                                                    className="object-contain"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = "https://placehold.co/160x60/f1f5f9/64748b?text=Logo";
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="rounded-lg border bg-muted h-full flex items-center justify-center p-4">
                                                <p className="text-sm text-muted-foreground">อัพโหลดหรือใส่ URL เพื่อดูตัวอย่าง</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="flex items-center gap-2">
                                    <Wallpaper className="h-4 w-4" />
                                    รูปพื้นหลัง
                                </Label>

                                {/* Preview full-width */}
                                {settings.backgroundImage ? (
                                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border bg-muted">
                                        <img
                                            src={settings.backgroundImage}
                                            alt="Background Preview"
                                            className={`w-full h-full object-cover transition-all duration-300 ${settings.backgroundBlur ? "blur-sm scale-105" : ""}`}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = "https://placehold.co/800x400/f1f5f9/64748b?text=Invalid+URL";
                                            }}
                                        />
                                        <div className={`absolute inset-0 transition-all duration-300 ${settings.backgroundBlur ? "bg-white/40" : "bg-white/10"}`} />
                                        <span className="absolute bottom-2 right-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                                            {settings.backgroundBlur ? "🌫️ เบลอ" : "🖼️ สีชัด"}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="w-full aspect-video rounded-xl border bg-muted flex items-center justify-center">
                                        <p className="text-sm text-muted-foreground">อัพโหลดหรือใส่ URL เพื่อดูตัวอย่าง</p>
                                    </div>
                                )}

                                {/* Controls row */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <input
                                        ref={bgInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        className="hidden"
                                        onChange={handleBgUpload}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                        onClick={() => bgInputRef.current?.click()}
                                        disabled={isUploadingBg}
                                    >
                                        {isUploadingBg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                        {isUploadingBg ? "กำลังอัพโหลด..." : "อัพโหลด"}
                                    </Button>

                                    <div className="flex-1 flex gap-2 min-w-0">
                                        <Input
                                            value={settings.backgroundImage}
                                            onChange={(e) => updateSetting("backgroundImage", e.target.value)}
                                            placeholder="วาง URL รูปพื้นหลัง..."
                                            className="flex-1 min-w-0"
                                        />
                                        {settings.backgroundImage && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => updateSetting("backgroundImage", "")}
                                                className="text-red-500 hover:text-red-600 shrink-0"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Blur toggle + hint */}
                                <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3 bg-gray-50 dark:bg-zinc-800">
                                    <div>
                                        <p className="text-sm font-medium">เบลอพื้นหลัง</p>
                                        <p className="text-xs text-muted-foreground">ทำให้รูปเบลอเพื่อให้อ่านเนื้อหาได้ง่ายขึ้น</p>
                                    </div>
                                    <Switch
                                        checked={settings.backgroundBlur}
                                        onCheckedChange={(checked) => updateSetting("backgroundBlur", checked)}
                                    />
                                </div>

                                <p className="text-xs text-muted-foreground">แนะนำ: 1920×1080 พิกเซล</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 xl:col-span-7">
                    {/* Banner Images */}
                    <div>
                        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                            <ImageIcon className="h-5 w-5" />
                            รูปภาพ Banner (Carousel)
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            รองรับไฟล์ JPG, PNG, WebP, GIF (สูงสุด 5MB) • แนะนำขนาด 2000x500px
                        </p>
                        <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
                            {[1, 2, 3].map((num) => (
                                <BannerCard
                                    key={num}
                                    number={num}
                                    image={settings[`bannerImage${num}` as keyof SiteSettings] as string}
                                    title={settings[`bannerTitle${num}` as keyof SiteSettings] as string}
                                    subtitle={settings[`bannerSubtitle${num}` as keyof SiteSettings] as string}
                                    onImageChange={(v) => updateSetting(`bannerImage${num}` as keyof SiteSettings, v)}
                                    onTitleChange={(v) => updateSetting(`bannerTitle${num}` as keyof SiteSettings, v)}
                                    onSubtitleChange={(v) => updateSetting(`bannerSubtitle${num}` as keyof SiteSettings, v)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Save Button Bottom */}
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
            </div>
        </div>
    );
}

// Banner Card Component
function BannerCard({
    number,
    image,
    title,
    subtitle,
    onImageChange,
    onTitleChange,
    onSubtitleChange,
}: Readonly<{
    number: number;
    image: string;
    title: string;
    subtitle: string;
    onImageChange: (v: string) => void;
    onTitleChange: (v: string) => void;
    onSubtitleChange: (v: string) => void;
}>) {
    const [isUploading, setIsUploading] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [showUrlInput, setShowUrlInput] = React.useState(false);

    // Check if image is a valid URL or local path
    const isValidUrl = (url: string) => {
        if (!url || url.trim() === "") return false;
        // Allow local uploads starting with /
        if (url.startsWith("/")) return true;
        try {
            new URL(url);
            return url.startsWith("http://") || url.startsWith("https://");
        } catch {
            return false;
        }
    };

    const hasValidImage = isValidUrl(image);

    // Handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const compressed = await compressImage(file);
            const formData = new FormData();
            formData.append("file", compressed);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                onImageChange(data.url);
                showSuccess("อัพโหลดรูป Banner สำเร็จ!");
            } else {
                showError(data.message || "อัพโหลดไม่สำเร็จ");
            }
        } catch (error) {
            showError(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัพโหลด");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="border-b border-border py-2.5 px-4 flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-[#1a56db] font-semibold">Banner {number}</Badge>
            </div>
            <div className="p-4 space-y-4">
                <div className="space-y-2">
                    <Label>รูปภาพ</Label>

                    {/* File Upload */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleFileUpload}
                    />

                    <button
                        type="button"
                        className="relative w-full aspect-[4/1] rounded-xl overflow-hidden bg-muted border group"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {hasValidImage ? (
                            <>
                                {/* Using img tag to avoid next/image URL validation issues */}
                                <img
                                    src={image}
                                    alt={`Banner ${number} Preview`}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = "https://placehold.co/800x200/f1f5f9/64748b?text=Invalid+URL";
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
                            </>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <p className="text-muted-foreground text-sm">คลิกเพื่ออัพโหลดรูป Banner</p>
                            </div>
                        )}

                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex items-center gap-2 rounded-lg bg-background/90 text-foreground px-3 py-2 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                {isUploading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="h-4 w-4" />
                                )}
                                <span className="text-sm font-medium">
                                    {isUploading ? "กำลังปรับปรุงภาพ..." : "อัพโหลด / เปลี่ยนรูป"}
                                </span>
                            </div>
                        </div>
                    </button>

                    <div className="flex items-center justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="px-0"
                            onClick={() => setShowUrlInput((v) => !v)}
                        >
                            {showUrlInput ? "ซ่อน URL" : "ใส่ URL"}
                        </Button>
                        {image && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => onImageChange("")}
                            >
                                ล้างรูป
                            </Button>
                        )}
                    </div>

                    {showUrlInput && (
                        <div className="flex gap-2">
                            <Input
                                value={image}
                                onChange={(e) => onImageChange(e.target.value)}
                                placeholder="วาง URL รูปภาพ..."
                                className="flex-1"
                            />
                            {image && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onImageChange("")}
                                    className="text-red-500 hover:text-red-600"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid gap-4">
                    <div className="space-y-2">
                        <Label>หัวข้อ</Label>
                        <Input
                            value={title}
                            onChange={(e) => onTitleChange(e.target.value)}
                            placeholder="Game ID Marketplace"
                            className="rounded-md"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>คำอธิบาย</Label>
                        <Input
                            value={subtitle}
                            onChange={(e) => onSubtitleChange(e.target.value)}
                            placeholder="ซื้อขายไอดีเกมปลอดภัย 100%"
                            className="rounded-md"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
