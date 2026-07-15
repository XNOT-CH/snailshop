"use client";

import { SpinnerScreen } from "@/components/SpinnerScreen";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Swal from "sweetalert2";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from "@/lib/swal";
import { compressImage } from "@/lib/compressImage";
import { uploadFileToApi } from "@/lib/client/uploadClient";
import { IMAGE_UPLOAD_RECOMMENDATIONS } from "@/lib/imageUploadRecommendations";
import {
    ChevronLeft,
    ChevronRight,
    Image as ImageIcon,
    LayoutGrid,
    Loader2,
    Mail,
    Megaphone,
    Phone,
    Plus,
    RotateCcw,
    Save,
    Trash2,
    Type,
    Upload,
    Wallpaper,
    X,
} from "lucide-react";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { PERMISSIONS } from "@/lib/permissions";

interface ExtraBanner {
    image: string;
    title: string;
    subtitle: string;
}

interface BannerSlot {
    image: string;
    title: string;
    subtitle: string;
}

/** Saved-state snapshot used to detect unsaved edits. */
interface SettingsSnapshot {
    settings: SiteSettings;
    extraBanners: ExtraBanner[];
}

const isValidHttpUrl = (value: string) => {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
};

/** Full URL or local upload path, same rule as the server-side schema. */
const isValidImageRef = (value: string) => value.startsWith("/") || isValidHttpUrl(value);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    bannersJson: string;
    logoUrl: string;
    ogImageUrl: string;
    backgroundImage: string;
    backgroundBlur: boolean;
    showAllProducts: boolean;
    footerDescription: string;
    contactPhone: string;
    contactEmail: string;
    facebookUrl: string;
    twitterUrl: string;
    instagramUrl: string;
    lineUrl: string;
}

export default function AdminSettingsPage() {
    const permissions = useAdminPermissions();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingOg, setIsUploadingOg] = useState(false);
    const [isUploadingBg, setIsUploadingBg] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const ogInputRef = useRef<HTMLInputElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);
    const [extraBanners, setExtraBanners] = useState<ExtraBanner[]>([]);
    const [savedSnapshot, setSavedSnapshot] = useState<SettingsSnapshot | null>(null);
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
        bannersJson: "",
        logoUrl: "",
        ogImageUrl: "",
        backgroundImage: "",
        backgroundBlur: true,
        showAllProducts: true,
        footerDescription: "",
        contactPhone: "",
        contactEmail: "",
        facebookUrl: "",
        twitterUrl: "",
        instagramUrl: "",
        lineUrl: "",
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
                const loaded: SiteSettings = {
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
                    bannersJson: data.data.bannersJson || "",
                    logoUrl: data.data.logoUrl || "",
                    ogImageUrl: data.data.ogImageUrl || "",
                    backgroundImage: data.data.backgroundImage || "",
                    backgroundBlur: data.data.backgroundBlur ?? true,
                    showAllProducts: data.data.showAllProducts ?? true,
                    footerDescription: data.data.footerDescription || "",
                    contactPhone: data.data.contactPhone || "",
                    contactEmail: data.data.contactEmail || "",
                    facebookUrl: data.data.facebookUrl || "",
                    twitterUrl: data.data.twitterUrl || "",
                    instagramUrl: data.data.instagramUrl || "",
                    lineUrl: data.data.lineUrl || "",
                };
                // Parse extra banners
                let parsedBanners: ExtraBanner[] = [];
                try {
                    const parsed = data.data.bannersJson ? JSON.parse(data.data.bannersJson) : [];
                    parsedBanners = Array.isArray(parsed) ? parsed : [];
                } catch {
                    parsedBanners = [];
                }
                setSettings(loaded);
                setExtraBanners(parsedBanners);
                setSavedSnapshot({ settings: loaded, extraBanners: parsedBanners });
            }
        } catch (error) {
            console.error("[SETTINGS_FETCH]", error);
            showError("ไม่สามารถโหลดการตั้งค่าได้");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!canEditSettings) {
            showError("คุณไม่มีสิทธิ์แก้ไขตั้งค่า");
            return;
        }
        if (Object.keys(fieldErrors).length > 0) {
            showError("กรุณาแก้ข้อมูลที่ขึ้นสีแดงให้ถูกต้องก่อนบันทึก");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                ...settings,
                bannersJson: JSON.stringify(extraBanners),
            };
            const res = await fetchWithCsrf("/api/admin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (data.success) {
                setSavedSnapshot({ settings, extraBanners });
                showSuccess("บันทึกการตั้งค่าสำเร็จ");
            } else {
                showError(data.message || "เกิดข้อผิดพลาด");
            }
        } catch (error) {
            console.error("[SETTINGS_SAVE]", error);
            showError("ไม่สามารถบันทึกได้");
        } finally {
            setIsSaving(false);
        }
    };

    const discardChanges = async () => {
        if (!savedSnapshot) return;
        const confirmed = await Swal.fire({
            title: "ยกเลิกการแก้ไข?",
            text: "ค่าทั้งหมดจะกลับเป็นค่าที่บันทึกไว้ล่าสุด",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ยกเลิกการแก้ไข",
            cancelButtonText: "แก้ต่อ",
        });
        if (!confirmed.isConfirmed) return;
        setSettings(savedSnapshot.settings);
        setExtraBanners(savedSnapshot.extraBanners);
    };

    const addExtraBanner = () => {
        if (!canEditSettings) {
            showError("คุณไม่มีสิทธิ์แก้ไขตั้งค่า");
            return;
        }

        setExtraBanners(prev => [...prev, { image: "", title: "", subtitle: "" }]);
    };

    const removeExtraBanner = (index: number) => {
        if (!canEditSettings) {
            showError("คุณไม่มีสิทธิ์แก้ไขตั้งค่า");
            return;
        }

        setExtraBanners(prev => prev.filter((_, i) => i !== index));
    };

    const updateExtraBanner = (index: number, field: keyof ExtraBanner, value: string) => {
        if (!canEditSettings) {
            return;
        }

        setExtraBanners(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
    };

    const updateSetting = (key: keyof SiteSettings, value: string | boolean) => {
        if (!canEditSettings) {
            return;
        }

        setSettings(prev => ({ ...prev, [key]: value }));
    };

    // ── Banner slots: fixed slots 1–3 live in `settings`, the rest in
    //    `extraBanners`. A unified accessor lets reordering swap across both.
    const bannerSlots: BannerSlot[] = [
        { image: settings.bannerImage1, title: settings.bannerTitle1, subtitle: settings.bannerSubtitle1 },
        { image: settings.bannerImage2, title: settings.bannerTitle2, subtitle: settings.bannerSubtitle2 },
        { image: settings.bannerImage3, title: settings.bannerTitle3, subtitle: settings.bannerSubtitle3 },
        ...extraBanners,
    ];

    const setBannerSlot = (index: number, slot: BannerSlot) => {
        if (index < 3) {
            const n = index + 1;
            setSettings((prev) => ({
                ...prev,
                [`bannerImage${n}`]: slot.image,
                [`bannerTitle${n}`]: slot.title,
                [`bannerSubtitle${n}`]: slot.subtitle,
            }));
        } else {
            const extraIndex = index - 3;
            setExtraBanners((prev) => prev.map((banner, i) => (i === extraIndex ? { ...slot } : banner)));
        }
    };

    const moveBanner = (index: number, direction: -1 | 1) => {
        if (!canEditSettings) return;
        const target = index + direction;
        if (target < 0 || target >= bannerSlots.length) return;
        const a = bannerSlots[index];
        const b = bannerSlots[target];
        setBannerSlot(index, b);
        setBannerSlot(target, a);
    };

    const activeBannerCount = bannerSlots.filter((slot) => slot.image && slot.image.trim() !== "").length;
    const totalBannerCount = bannerSlots.length;
    const assetPanelClass = "rounded-2xl border border-border bg-muted/40 p-4";
    const canEditSettings = permissions.includes(PERMISSIONS.SETTINGS_EDIT);

    // ── Unsaved-changes tracking ──
    const changedCount = useMemo(() => {
        if (!savedSnapshot) return 0;
        let changed = (Object.keys(settings) as Array<keyof SiteSettings>).filter(
            (key) => settings[key] !== savedSnapshot.settings[key],
        ).length;
        const maxBanners = Math.max(extraBanners.length, savedSnapshot.extraBanners.length);
        for (let i = 0; i < maxBanners; i++) {
            if (JSON.stringify(extraBanners[i] ?? null) !== JSON.stringify(savedSnapshot.extraBanners[i] ?? null)) {
                changed += 1;
            }
        }
        return changed;
    }, [settings, extraBanners, savedSnapshot]);
    const isDirty = changedCount > 0;

    useEffect(() => {
        if (!isDirty) return;
        const warn = (event: BeforeUnloadEvent) => {
            event.preventDefault();
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [isDirty]);

    // ── Client-side validation (mirrors the server rules users hit most) ──
    const fieldErrors = useMemo(() => {
        const errors: Partial<Record<keyof SiteSettings, string>> = {};
        const urlFields: Array<keyof SiteSettings> = ["facebookUrl", "twitterUrl", "instagramUrl", "lineUrl"];
        for (const field of urlFields) {
            const value = (settings[field] as string).trim();
            if (value && !isValidHttpUrl(value)) {
                errors[field] = "URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)";
            }
        }
        const imageFields: Array<keyof SiteSettings> = ["logoUrl", "ogImageUrl", "backgroundImage"];
        for (const field of imageFields) {
            const value = (settings[field] as string).trim();
            if (value && !isValidImageRef(value)) {
                errors[field] = "ต้องเป็น URL เต็ม หรือ path รูปที่อัปโหลด (ขึ้นต้นด้วย /)";
            }
        }
        const email = settings.contactEmail.trim();
        if (email && !EMAIL_PATTERN.test(email)) {
            errors.contactEmail = "รูปแบบอีเมลไม่ถูกต้อง";
        }
        return errors;
    }, [settings]);

    const fieldErrorText = (key: keyof SiteSettings) =>
        fieldErrors[key] ? <p className="text-xs text-red-500">{fieldErrors[key]}</p> : null;
    const fieldErrorClass = (key: keyof SiteSettings) =>
        fieldErrors[key] ? "border-red-500 focus-visible:ring-red-500/40" : "";

    // Shared upload path for the logo / OG / background assets. Accepts a File
    // directly so both the hidden <input type="file"> and drag & drop use it.
    const uploadAssetFile = async (
        file: File,
        options: {
            field: "logoUrl" | "ogImageUrl" | "backgroundImage";
            maxBytes: number;
            preset?: "banner";
            setBusy: (busy: boolean) => void;
            successMessage: string;
            logTag: string;
        },
    ) => {
        if (!canEditSettings) {
            showError("คุณไม่มีสิทธิ์แก้ไขตั้งค่า");
            return;
        }

        options.setBusy(true);
        try {
            const compressed = await compressImage(file, options.maxBytes);
            const data = await uploadFileToApi(
                compressed,
                options.preset ? { extraFields: { preset: options.preset } } : undefined,
            );
            if (data.success) {
                updateSetting(options.field, data.url);
                showSuccess(options.successMessage);
            } else {
                showError(data.message || "อัพโหลดไม่สำเร็จ");
            }
        } catch (error) {
            console.error(options.logTag, error);
            showError(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัพโหลด");
        } finally {
            options.setBusy(false);
        }
    };

    const uploadLogoFile = (file: File) =>
        uploadAssetFile(file, {
            field: "logoUrl",
            maxBytes: 2 * 1024 * 1024,
            setBusy: setIsUploadingLogo,
            successMessage: "อัพโหลดโลโก้สำเร็จ!",
            logTag: "[SETTINGS_UPLOAD_LOGO]",
        });

    const uploadBgFile = (file: File) =>
        uploadAssetFile(file, {
            field: "backgroundImage",
            maxBytes: 4 * 1024 * 1024,
            preset: "banner",
            setBusy: setIsUploadingBg,
            successMessage: "อัพโหลดรูปพื้นหลังสำเร็จ!",
            logTag: "[SETTINGS_UPLOAD_BG]",
        });

    const uploadOgFile = (file: File) =>
        uploadAssetFile(file, {
            field: "ogImageUrl",
            maxBytes: 2 * 1024 * 1024,
            preset: "banner",
            setBusy: setIsUploadingOg,
            successMessage: "อัพโหลดรูปแชร์ลิงก์สำเร็จ!",
            logTag: "[SETTINGS_UPLOAD_OG]",
        });

    const fileFromInput = (e: React.ChangeEvent<HTMLInputElement>) => e.target.files?.[0];

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = fileFromInput(e);
        if (file) uploadLogoFile(file);
    };
    const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = fileFromInput(e);
        if (file) uploadBgFile(file);
    };
    const handleOgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = fileFromInput(e);
        if (file) uploadOgFile(file);
    };

    /** Drop-zone props: drop an image anywhere on the preview to upload it. */
    const dropProps = (upload: (file: File) => void) => ({
        onDragOver: (e: React.DragEvent) => e.preventDefault(),
        onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file && file.type.startsWith("image/")) upload(file);
        },
    });

    if (isLoading) {
        return <SpinnerScreen label="กำลังโหลดการตั้งค่า..." />;
    }

    return (
        <div className="space-y-8 animate-page-enter">
            {/* Header */}
            <div className="sticky top-0 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 bg-background/85 backdrop-blur border-b">
                <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">ตั้งค่าเว็บไซต์</h1>
                        <p className="text-muted-foreground">จัดการรูปภาพและข้อความบนเว็บไซต์</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isDirty && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                แก้ไข {changedCount} จุด
                            </Badge>
                        )}
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !canEditSettings || !isDirty}
                            className="w-full gap-2 sm:w-auto"
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            บันทึก
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-12">
                <div className="space-y-6 xl:col-span-5">
                    {/* Homepage Section Toggles */}
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                            <div className="w-6 h-6 bg-[#145de7] rounded flex items-center justify-center">
                                <LayoutGrid className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="font-bold">ส่วนแสดงผลหน้าแรก</span>
                            <span className="text-sm text-muted-foreground ml-1">— เปิด/ปิดส่วนต่างๆ ที่แสดงบนหน้าแรก</span>
                        </div>
                        <div className="p-5">
                            <div className="flex flex-col gap-3 rounded-xl border border-border p-4 bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-sm">สินค้าทั้งหมด</p>
                                        <Badge
                                            variant="secondary"
                                            className={settings.showAllProducts ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}
                                        >
                                            {settings.showAllProducts ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                                        </Badge>
                                    </div>
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
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                            <div className="w-6 h-6 bg-[#145de7] rounded flex items-center justify-center">
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
                                    placeholder="SNAILSHOP"
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
                            <div className={assetPanelClass}>
                                <div className="space-y-1">
                                    <Label>โลโก้</Label>
                                    <p className="text-xs text-muted-foreground">อัปโหลดหรือวาง URL เพื่อใช้เป็นโลโก้หลักของเว็บไซต์ • {IMAGE_UPLOAD_RECOMMENDATIONS.logoSquare}</p>
                                </div>
                                <div className="grid gap-4 lg:grid-cols-2">
                                    <div className="space-y-2">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                            <input
                                                ref={logoInputRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,image/gif"
                                                className="hidden"
                                                onChange={handleLogoUpload}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 shrink-0"
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
                                            <span className="shrink-0 text-sm text-muted-foreground">หรือวาง URL</span>
                                            <div className="flex min-w-0 flex-1 gap-2">
                                                <Input
                                                    value={settings.logoUrl}
                                                    onChange={(e) => updateSetting("logoUrl", e.target.value)}
                                                    placeholder="https://... หรือ /uploads/..."
                                                    className={`min-w-0 flex-1 ${fieldErrorClass("logoUrl")}`}
                                                />
                                                {settings.logoUrl && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => updateSetting("logoUrl", "")}
                                                        className="text-red-500 hover:text-red-600 shrink-0"
                                                        aria-label="ล้าง URL โลโก้"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        {fieldErrorText("logoUrl")}
                                        <p className="text-xs text-muted-foreground">ลากรูปมาวางในกล่องตัวอย่างเพื่ออัปโหลดได้เลย</p>
                                    </div>

                                    <div {...dropProps(uploadLogoFile)}>
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
                                            <div className="rounded-lg border border-dashed bg-muted h-full flex items-center justify-center p-4">
                                                <p className="text-sm text-muted-foreground">อัพโหลด / วาง URL / ลากรูปมาวางที่นี่</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className={assetPanelClass}>
                                <div className="space-y-1">
                                    <Label className="flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4" />
                                        รูปแชร์ลิงก์เว็บไซต์
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        ใช้เป็นรูปตัวอย่างเวลาแชร์ลิงก์เว็บลง Facebook, LINE หรือ Discord • {IMAGE_UPLOAD_RECOMMENDATIONS.socialShare}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div
                                        className="relative w-full overflow-hidden rounded-xl border bg-muted aspect-[1200/630]"
                                        {...dropProps(uploadOgFile)}
                                    >
                                        {settings.ogImageUrl ? (
                                            <>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={settings.ogImageUrl}
                                                    alt="Social Share Preview"
                                                    className="h-full w-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = "https://placehold.co/1200x630/f1f5f9/64748b?text=Invalid+URL";
                                                    }}
                                                />
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent p-4 text-white">
                                                    <p className="text-sm font-semibold">{settings.heroTitle || "ชื่อเว็บไซต์"}</p>
                                                    <p className="text-xs opacity-90">{settings.heroDescription || "คำอธิบายเว็บไซต์"}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex h-full items-center justify-center p-6 text-center">
                                                <p className="text-sm text-muted-foreground">อัพโหลดหรือวาง URL เพื่อกำหนดรูปตัวอย่างเวลามีคนแชร์ลิงก์เว็บไซต์</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <input
                                            ref={ogInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/gif"
                                            className="hidden"
                                            onChange={handleOgUpload}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 shrink-0"
                                            onClick={() => ogInputRef.current?.click()}
                                            disabled={isUploadingOg}
                                        >
                                            {isUploadingOg ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Upload className="h-4 w-4" />
                                            )}
                                            {isUploadingOg ? "กำลังอัพโหลด..." : "อัพโหลด"}
                                        </Button>
                                        <span className="shrink-0 text-sm text-muted-foreground">หรือวาง URL</span>
                                        <div className="flex min-w-0 flex-1 gap-2">
                                            <Input
                                                value={settings.ogImageUrl}
                                                onChange={(e) => updateSetting("ogImageUrl", e.target.value)}
                                                placeholder="https://... หรือ /uploads/..."
                                                className={`min-w-0 flex-1 ${fieldErrorClass("ogImageUrl")}`}
                                            />
                                            {settings.ogImageUrl && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => updateSetting("ogImageUrl", "")}
                                                    className="text-red-500 hover:text-red-600 shrink-0"
                                                    aria-label="ล้าง URL รูปแชร์ลิงก์"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    {fieldErrorText("ogImageUrl")}
                                </div>
                            </div>
                            <div className={assetPanelClass}>
                                <div className="space-y-1">
                                    <Label className="flex items-center gap-2">
                                        <Wallpaper className="h-4 w-4" />
                                        รูปพื้นหลัง
                                    </Label>
                                    <p className="text-xs text-muted-foreground">ใช้ภาพพื้นหลังหน้าแรก และเลือกได้ว่าจะเบลอเพื่อให้อ่านข้อความด้านหน้าได้ง่ายขึ้น</p>
                                </div>

                                {/* Preview full-width */}
                                {settings.backgroundImage ? (
                                    <div
                                        className="relative w-full aspect-video rounded-xl overflow-hidden border bg-muted"
                                        {...dropProps(uploadBgFile)}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
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
                                            {settings.backgroundBlur ? "เบลอ" : "สีชัด"}
                                        </span>
                                    </div>
                                  ) : (
                                      <div
                                          className="w-full aspect-video rounded-xl border border-dashed border-border bg-muted flex items-center justify-center"
                                          {...dropProps(uploadBgFile)}
                                      >
                                          <p className="text-sm text-muted-foreground">ค่าเริ่มต้นพื้นหลังเว็บ: #ffffff — ลากรูปมาวางที่นี่เพื่ออัปโหลด</p>
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

                                    <span className="shrink-0 text-sm text-muted-foreground">หรือวาง URL</span>
                                    <div className="flex-1 flex gap-2 min-w-0">
                                        <Input
                                            value={settings.backgroundImage}
                                            onChange={(e) => updateSetting("backgroundImage", e.target.value)}
                                            placeholder="https://... หรือ /uploads/..."
                                            className={`flex-1 min-w-0 ${fieldErrorClass("backgroundImage")}`}
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
                                {fieldErrorText("backgroundImage")}

                                {/* Blur toggle + hint */}
                                <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3 bg-muted/50">
                                    <div>
                                        <p className="text-sm font-medium">เบลอพื้นหลัง</p>
                                        <p className="text-xs text-muted-foreground">ทำให้รูปเบลอเพื่อให้อ่านเนื้อหาได้ง่ายขึ้น</p>
                                    </div>
                                    <Switch
                                        checked={settings.backgroundBlur}
                                        onCheckedChange={(checked) => updateSetting("backgroundBlur", checked)}
                                    />
                                </div>

                                <p className="text-xs text-muted-foreground">{IMAGE_UPLOAD_RECOMMENDATIONS.backgroundWide}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 xl:col-span-7">
                    {/* Banner Images */}
                    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                        <div className="border-b border-border px-5 py-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                                        <ImageIcon className="h-5 w-5" />
                                        รูปภาพ Banner (Carousel)
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        รองรับไฟล์ JPG, PNG, WebP, GIF สูงสุด 5MB ระบบจะย่อ บีบอัด และแปลงไฟล์ให้อัตโนมัติก่อนบันทึก • {IMAGE_UPLOAD_RECOMMENDATIONS.bannerCarousel}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                        พร้อมใช้งาน {activeBannerCount}/{totalBannerCount}
                                    </Badge>
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                                        แสดงบนหน้าแรกแบบสไลด์
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4 p-5">
                            {/* Slide-order preview: what the homepage carousel will show, in order */}
                            {activeBannerCount > 0 && (
                                <div className="rounded-2xl border border-border bg-muted/40 p-3">
                                    <p className="mb-2 text-xs font-medium text-muted-foreground">ตัวอย่างลำดับสไลด์บนหน้าแรก (ใช้ปุ่ม ◀ ▶ บนการ์ดเพื่อสลับลำดับ)</p>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {bannerSlots.map((slot, idx) =>
                                            slot.image?.trim() ? (
                                                <div
                                                    key={`order-${idx}`}
                                                    className="relative h-16 w-40 shrink-0 overflow-hidden rounded-lg border bg-muted"
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={slot.image} alt={`สไลด์ ${idx + 1}`} className="h-full w-full object-cover" />
                                                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-xs font-bold text-white">
                                                        {idx + 1}
                                                    </span>
                                                    {slot.title && (
                                                        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-0.5 pt-2 text-[10px] text-white">
                                                            {slot.title}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : null,
                                        )}
                                    </div>
                                </div>
                            )}

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
                                        onMoveLeft={num > 1 ? () => moveBanner(num - 1, -1) : undefined}
                                        onMoveRight={num - 1 < totalBannerCount - 1 ? () => moveBanner(num - 1, 1) : undefined}
                                        canEdit={canEditSettings}
                                    />
                                ))}
                                {extraBanners.map((banner, idx) => (
                                    <BannerCard
                                        key={`extra-${idx}`}
                                        number={4 + idx}
                                        image={banner.image}
                                        title={banner.title}
                                        subtitle={banner.subtitle}
                                        onImageChange={(v) => updateExtraBanner(idx, "image", v)}
                                        onTitleChange={(v) => updateExtraBanner(idx, "title", v)}
                                        onSubtitleChange={(v) => updateExtraBanner(idx, "subtitle", v)}
                                        onRemove={() => removeExtraBanner(idx)}
                                        onMoveLeft={() => moveBanner(3 + idx, -1)}
                                        onMoveRight={3 + idx < totalBannerCount - 1 ? () => moveBanner(3 + idx, 1) : undefined}
                                        canEdit={canEditSettings}
                                    />
                                ))}
                            </div>
                            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-medium text-foreground">เพิ่มป้ายโปรโมชันได้ตามต้องการ</p>
                                    <p className="text-xs text-muted-foreground">แบนเนอร์ที่มีรูปแล้วจะถูกนับเป็นชุดพร้อมใช้งานทันที</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="gap-2 border-dashed"
                                    onClick={addExtraBanner}
                                    disabled={!canEditSettings}
                                >
                                    <Plus className="h-4 w-4" />
                                    เพิ่มป้าย
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Footer / Contact */}
                    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                        <div className="border-b border-border px-5 py-4">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-[#145de7] rounded flex items-center justify-center">
                                    <Phone className="h-3.5 w-3.5 text-white" />
                                </div>
                                <div>
                                    <p className="font-bold">ส่วนท้าย & ช่องทางติดต่อ</p>
                                    <p className="text-xs text-muted-foreground">ข้อความ เบอร์โทร อีเมล และลิงก์โซเชียลที่แสดงในส่วนท้ายเว็บไซต์</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-5 p-5">
                            <div className="space-y-2">
                                <Label htmlFor="footerDescription">ข้อความใต้โลโก้ (คำอธิบาย/ข้อจำกัดความรับผิด)</Label>
                                <Textarea
                                    id="footerDescription"
                                    rows={3}
                                    placeholder="เช่น เว็บไซต์ขึ้นเทพเป็นเพียงตัวแทนจำหน่าย..."
                                    value={settings.footerDescription}
                                    onChange={(e) => updateSetting("footerDescription", e.target.value)}
                                    disabled={!canEditSettings}
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="contactPhone" className="flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5" /> เบอร์โทรศัพท์
                                    </Label>
                                    <Input
                                        id="contactPhone"
                                        placeholder="094-889-1954"
                                        value={settings.contactPhone}
                                        onChange={(e) => updateSetting("contactPhone", e.target.value)}
                                        disabled={!canEditSettings}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contactEmail" className="flex items-center gap-1.5">
                                        <Mail className="h-3.5 w-3.5" /> อีเมล
                                    </Label>
                                    <Input
                                        id="contactEmail"
                                        placeholder="support@example.com"
                                        value={settings.contactEmail}
                                        onChange={(e) => updateSetting("contactEmail", e.target.value)}
                                        disabled={!canEditSettings}
                                        className={fieldErrorClass("contactEmail")}
                                    />
                                    {fieldErrorText("contactEmail")}
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="facebookUrl">Facebook URL</Label>
                                    <Input
                                        id="facebookUrl"
                                        placeholder="https://facebook.com/yourpage"
                                        value={settings.facebookUrl}
                                        onChange={(e) => updateSetting("facebookUrl", e.target.value)}
                                        disabled={!canEditSettings}
                                        className={fieldErrorClass("facebookUrl")}
                                    />
                                    {fieldErrorText("facebookUrl")}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="twitterUrl">Twitter / X URL</Label>
                                    <Input
                                        id="twitterUrl"
                                        placeholder="https://twitter.com/yourhandle"
                                        value={settings.twitterUrl}
                                        onChange={(e) => updateSetting("twitterUrl", e.target.value)}
                                        disabled={!canEditSettings}
                                        className={fieldErrorClass("twitterUrl")}
                                    />
                                    {fieldErrorText("twitterUrl")}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="instagramUrl">Instagram URL</Label>
                                    <Input
                                        id="instagramUrl"
                                        placeholder="https://instagram.com/yourpage"
                                        value={settings.instagramUrl}
                                        onChange={(e) => updateSetting("instagramUrl", e.target.value)}
                                        disabled={!canEditSettings}
                                        className={fieldErrorClass("instagramUrl")}
                                    />
                                    {fieldErrorText("instagramUrl")}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lineUrl">LINE URL</Label>
                                    <Input
                                        id="lineUrl"
                                        placeholder="https://line.me/ti/p/~yourid"
                                        value={settings.lineUrl}
                                        onChange={(e) => updateSetting("lineUrl", e.target.value)}
                                        disabled={!canEditSettings}
                                        className={fieldErrorClass("lineUrl")}
                                    />
                                    {fieldErrorText("lineUrl")}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                เว้นว่างช่องไหนไว้ ไอคอนหรือข้อมูลนั้นจะไม่แสดงในส่วนท้ายเว็บไซต์
                            </p>
                        </div>
                    </div>

                    {/* Unsaved-changes bar: only appears while there is something to save */}
                    {isDirty && (
                        <div className="sticky bottom-4 z-20">
                            <div className="ml-auto flex flex-col gap-3 rounded-2xl border border-amber-300/60 bg-background/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between dark:border-amber-700/50">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        มีการแก้ไข {changedCount} จุดที่ยังไม่บันทึก
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {Object.keys(fieldErrors).length > 0
                                            ? "มีข้อมูลที่ไม่ถูกต้อง (ขึ้นสีแดง) — แก้ก่อนถึงจะบันทึกได้"
                                            : "ถ้าออกจากหน้านี้โดยไม่บันทึก การแก้ไขจะหายทั้งหมด"}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Button
                                        variant="outline"
                                        onClick={discardChanges}
                                        disabled={isSaving}
                                        className="gap-2"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        ยกเลิกการแก้ไข
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving || !canEditSettings}
                                        size="lg"
                                        className="gap-2 sm:min-w-[180px]"
                                    >
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
                    )}
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
    onRemove,
    onMoveLeft,
    onMoveRight,
    canEdit,
}: Readonly<{
    number: number;
    image: string;
    title: string;
    subtitle: string;
    onImageChange: (v: string) => void;
    onTitleChange: (v: string) => void;
    onSubtitleChange: (v: string) => void;
    onRemove?: () => void;
    onMoveLeft?: () => void;
    onMoveRight?: () => void;
    canEdit: boolean;
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

    // Handle file upload (from the hidden input or drag & drop)
    const uploadBannerFile = async (file: File) => {
        if (!canEdit) {
            showError("คุณไม่มีสิทธิ์แก้ไขตั้งค่า");
            return;
        }

        setIsUploading(true);
        try {
            const compressed = await compressImage(file, 4 * 1024 * 1024);
            const data = await uploadFileToApi(compressed, { extraFields: { preset: "banner" } });
            if (data.success) {
                onImageChange(data.url);
                showSuccess("อัพโหลดรูป Banner สำเร็จ!");
            } else {
                showError(data.message || "อัพโหลดไม่สำเร็จ");
            }
        } catch (error) {
            console.error("[SETTINGS_UPLOAD_BANNER]", error);
            showError(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัพโหลด");
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadBannerFile(file);
    };

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="border-b border-border py-2.5 px-4 flex items-center justify-between gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-[#145de7] font-semibold dark:bg-blue-950/40 dark:text-blue-300">
                    Banner {number}
                </Badge>
                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={onMoveLeft}
                        disabled={!canEdit || !onMoveLeft}
                        title="เลื่อนลำดับขึ้น (แสดงก่อน)"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={onMoveRight}
                        disabled={!canEdit || !onMoveRight}
                        title="เลื่อนลำดับลง (แสดงทีหลัง)"
                    >
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    {onRemove && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            onClick={onRemove}
                            disabled={!canEdit}
                            title="ลบป้ายนี้"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
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
                        disabled={!canEdit}
                        onChange={handleFileUpload}
                    />

                    <button
                        type="button"
                        className="relative w-full aspect-[4/1] rounded-xl overflow-hidden bg-muted border group"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (file && file.type.startsWith("image/")) uploadBannerFile(file);
                        }}
                        disabled={!canEdit}
                    >
                        {hasValidImage ? (
                            <>
                                {/* Using img tag to avoid next/image URL validation issues */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
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
                            disabled={!canEdit}
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
                                disabled={!canEdit}
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
                                disabled={!canEdit}
                                className="flex-1"
                            />
                            {image && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onImageChange("")}
                                    disabled={!canEdit}
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
                            disabled={!canEdit}
                            className="rounded-md"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>คำอธิบาย</Label>
                        <Input
                            value={subtitle}
                            onChange={(e) => onSubtitleChange(e.target.value)}
                            placeholder="ซื้อขายไอดีเกมปลอดภัย 100%"
                            disabled={!canEdit}
                            className="rounded-md"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
