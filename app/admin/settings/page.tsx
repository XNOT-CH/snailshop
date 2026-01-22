"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Loader2, Image as ImageIcon, Type, Megaphone, Wallpaper } from "lucide-react";
import Image from "next/image";

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
}

export default function AdminSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
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
                });
            }
        } catch (error) {
            toast.error("ไม่สามารถโหลดการตั้งค่าได้");
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
                toast.success("บันทึกการตั้งค่าสำเร็จ");
            } else {
                toast.error(data.message || "เกิดข้อผิดพลาด");
            }
        } catch (error) {
            toast.error("ไม่สามารถบันทึกได้");
        } finally {
            setIsSaving(false);
        }
    };

    const updateSetting = (key: keyof SiteSettings, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
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
            <div className="flex items-center justify-between">
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

            {/* General Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Type className="h-5 w-5" />
                        ข้อความทั่วไป
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
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
                    </div>
                    <div className="space-y-2">
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
                    <div className="space-y-2">
                        <Label>URL โลโก้</Label>
                        <Input
                            value={settings.logoUrl}
                            onChange={(e) => updateSetting("logoUrl", e.target.value)}
                            placeholder="https://example.com/logo.png"
                        />
                        {settings.logoUrl && (
                            <div className="mt-2 p-4 bg-slate-100 rounded-lg">
                                <Image
                                    src={settings.logoUrl}
                                    alt="Logo Preview"
                                    width={120}
                                    height={40}
                                    className="object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = "https://placehold.co/120x40/f1f5f9/64748b?text=Logo";
                                    }}
                                />
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Wallpaper className="h-4 w-4" />
                            URL รูปพื้นหลัง
                        </Label>
                        <Input
                            value={settings.backgroundImage}
                            onChange={(e) => updateSetting("backgroundImage", e.target.value)}
                            placeholder="https://example.com/background.jpg"
                        />
                        <p className="text-xs text-muted-foreground">
                            รูปภาพจะแสดงเป็นพื้นหลังของเว็บไซต์ทั้งหมด (แนะนำ: 1920x1080 พิกเซล)
                        </p>
                        {settings.backgroundImage && (
                            <div className="mt-2 relative aspect-video rounded-lg overflow-hidden bg-slate-100">
                                <img
                                    src={settings.backgroundImage}
                                    alt="Background Preview"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = "https://placehold.co/800x400/f1f5f9/64748b?text=Invalid+URL";
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Separator />

            {/* Banner Images */}
            <div>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    รูปภาพ Banner (Carousel)
                </h2>
                <div className="grid gap-6">
                    {[1, 2, 3].map((num) => (
                        <BannerCard
                            key={num}
                            number={num}
                            image={settings[`bannerImage${num}` as keyof SiteSettings]}
                            title={settings[`bannerTitle${num}` as keyof SiteSettings]}
                            subtitle={settings[`bannerSubtitle${num}` as keyof SiteSettings]}
                            onImageChange={(v) => updateSetting(`bannerImage${num}` as keyof SiteSettings, v)}
                            onTitleChange={(v) => updateSetting(`bannerTitle${num}` as keyof SiteSettings, v)}
                            onSubtitleChange={(v) => updateSetting(`bannerSubtitle${num}` as keyof SiteSettings, v)}
                        />
                    ))}
                </div>
            </div>

            {/* Save Button Bottom */}
            <div className="flex justify-end pt-4">
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

// Banner Card Component
function BannerCard({
    number,
    image,
    title,
    subtitle,
    onImageChange,
    onTitleChange,
    onSubtitleChange,
}: {
    number: number;
    image: string;
    title: string;
    subtitle: string;
    onImageChange: (v: string) => void;
    onTitleChange: (v: string) => void;
    onSubtitleChange: (v: string) => void;
}) {
    // Check if image is a valid URL
    const isValidUrl = (url: string) => {
        if (!url || url.trim() === "") return false;
        try {
            new URL(url);
            return url.startsWith("http://") || url.startsWith("https://");
        } catch {
            return false;
        }
    };

    const hasValidImage = isValidUrl(image);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Badge variant="secondary">Banner {number}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>URL รูปภาพ</Label>
                            <Input
                                value={image}
                                onChange={(e) => onImageChange(e.target.value)}
                                placeholder="https://example.com/banner.jpg"
                            />
                            <p className="text-xs text-muted-foreground">
                                แนะนำ: ขนาด 2000x500 พิกเซล
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>หัวข้อ</Label>
                            <Input
                                value={title}
                                onChange={(e) => onTitleChange(e.target.value)}
                                placeholder="Game ID Marketplace"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>คำอธิบาย</Label>
                            <Input
                                value={subtitle}
                                onChange={(e) => onSubtitleChange(e.target.value)}
                                placeholder="ซื้อขายไอดีเกมปลอดภัย 100%"
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-center">
                        {hasValidImage ? (
                            <div className="relative w-full aspect-[4/1] rounded-xl overflow-hidden bg-slate-100">
                                {/* Using img tag to avoid next/image URL validation issues */}
                                <img
                                    src={image}
                                    alt={`Banner ${number} Preview`}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = "https://placehold.co/800x200/f1f5f9/64748b?text=Invalid+URL";
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent flex flex-col justify-center p-4">
                                    <p className="text-white font-bold text-sm truncate">{title || "หัวข้อ"}</p>
                                    <p className="text-white/80 text-xs truncate">{subtitle || "คำอธิบาย"}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full aspect-[4/1] rounded-xl bg-slate-100 flex items-center justify-center">
                                <p className="text-slate-400 text-sm">ใส่ URL รูปภาพเพื่อดูตัวอย่าง</p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
