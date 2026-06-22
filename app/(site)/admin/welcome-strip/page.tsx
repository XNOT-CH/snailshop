"use client";

import { SpinnerScreen } from "@/components/SpinnerScreen";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Eye,
    Image as ImageIcon,
    Loader2,
    Plus,
    Save,
    Upload,
    X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { compressImage } from "@/lib/compressImage";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { uploadFileToApi } from "@/lib/client/uploadClient";
import { PERMISSIONS } from "@/lib/permissions";
import {
    normalizeWelcomeStripImages,
    serializeWelcomeStripImages,
    WELCOME_STRIP_DEFAULT_SLOT_COUNT,
    WELCOME_STRIP_MAX_SLOT_COUNT,
    WELCOME_STRIP_SLOT_COUNT,
} from "@/lib/welcomeStrip";
import { showError, showSuccess } from "@/lib/swal";

export default function WelcomeStripAdminPage() {
    const permissions = useAdminPermissions();
    const canEditSettings = permissions.includes(PERMISSIONS.SETTINGS_EDIT);
    const [images, setImages] = useState<string[]>(() => normalizeWelcomeStripImages(null));
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

    useEffect(() => {
        let ignore = false;

        async function fetchSettings() {
            try {
                const response = await fetch("/api/admin/settings");
                const data = await response.json();

                if (!ignore && data.success) {
                    setImages(normalizeWelcomeStripImages(data.data?.welcomeStripImagesJson));
                }
            } catch (error) {
                console.error("[WELCOME_STRIP_FETCH]", error);
                showError("ไม่สามารถโหลดรูป Welcome Strip ได้");
            } finally {
                if (!ignore) {
                    setIsLoading(false);
                }
            }
        }

        fetchSettings();

        return () => {
            ignore = true;
        };
    }, []);

    const updateImage = (index: number, value: string) => {
        if (!canEditSettings) return;

        setImages((current) => current.map((image, imageIndex) => (
            imageIndex === index ? value : image
        )));
    };

    const addImageSlot = () => {
        if (!canEditSettings) return;

        setImages((current) => (
            current.length < WELCOME_STRIP_MAX_SLOT_COUNT
                ? [...current, ""]
                : current
        ));
    };

    const removeImageSlot = (index: number) => {
        if (!canEditSettings) return;

        setImages((current) => {
            if (current.length <= WELCOME_STRIP_DEFAULT_SLOT_COUNT) return current;
            return current.filter((_, imageIndex) => imageIndex !== index);
        });
    };

    const handleUpload = async (index: number, file?: File) => {
        if (!canEditSettings) {
            showError("คุณไม่มีสิทธิ์แก้ไขตั้งค่า");
            return;
        }

        if (!file) return;

        setUploadingIndex(index);
        try {
            const compressed = await compressImage(file);
            const data = await uploadFileToApi(compressed);

            if (data.success) {
                updateImage(index, data.url);
                showSuccess("อัพโหลดรูปสำเร็จ");
            } else {
                showError(data.message || "อัพโหลดไม่สำเร็จ");
            }
        } catch (error) {
            console.error("[WELCOME_STRIP_UPLOAD]", error);
            showError(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัพโหลด");
        } finally {
            setUploadingIndex(null);
        }
    };

    const handleSave = async () => {
        if (!canEditSettings) {
            showError("คุณไม่มีสิทธิ์แก้ไขตั้งค่า");
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetchWithCsrf("/api/admin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    welcomeStripImagesJson: serializeWelcomeStripImages(images),
                }),
            });
            const data = await response.json();

            if (data.success) {
                setImages(normalizeWelcomeStripImages(data.data?.welcomeStripImagesJson));
                showSuccess("บันทึกรูป Welcome Strip สำเร็จ");
            } else {
                showError(data.message || "ไม่สามารถบันทึกได้");
            }
        } catch (error) {
            console.error("[WELCOME_STRIP_SAVE]", error);
            showError("ไม่สามารถบันทึกได้");
        } finally {
            setIsSaving(false);
        }
    };

    const activeCount = images.filter((image) => image.trim() !== "").length;
    const canAddSlot = canEditSettings && images.length < WELCOME_STRIP_MAX_SLOT_COUNT;
    const canRemoveSlot = canEditSettings && images.length > WELCOME_STRIP_DEFAULT_SLOT_COUNT;

    if (isLoading) {
        return <SpinnerScreen label="กำลังโหลด..." />;
    }

    return (
        <div className="space-y-6 animate-page-enter">
            <div className="sticky top-0 z-20 -mx-4 border-b bg-background/85 px-4 backdrop-blur sm:-mx-6 sm:px-6">
                <div className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">รูปแถบ Welcome</h1>
                        <p className="text-muted-foreground">
                            เริ่มต้น {WELCOME_STRIP_SLOT_COUNT} ช่อง และเพิ่มได้สูงสุด {WELCOME_STRIP_MAX_SLOT_COUNT} ช่อง ระบบจะนำไปซ้ำเป็น {images.length * 2} ช่องบนหน้า Welcome อัตโนมัติ
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button type="button" variant="outline" onClick={addImageSlot} disabled={!canAddSlot} className="gap-2">
                            <Plus className="h-4 w-4" />
                            เพิ่มช่อง
                        </Button>
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/welcome?preview=1" target="_blank">
                                <Eye className="h-4 w-4" />
                                ดูตัวอย่าง
                            </Link>
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving || !canEditSettings} className="gap-2">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            บันทึก
                        </Button>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-white shadow-sm dark:bg-zinc-900">
                <div className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-semibold">
                            <ImageIcon className="h-5 w-5" />
                            รูปที่แสดงในแถบด้านล่าง
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            แนะนำรูปสี่เหลี่ยมจัตุรัส เช่น 512 x 512px เพื่อให้เข้ากับกรอบบนหน้า Welcome
                        </p>
                    </div>
                    <Badge className="w-fit border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                        ตั้งรูปแล้ว {activeCount}/{images.length}
                    </Badge>
                </div>

                <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {images.map((image, index) => {
                        const inputId = `welcome-strip-image-${index}`;
                        const isUploading = uploadingIndex === index;

                        return (
                            <div key={inputId} className="rounded-xl border border-border bg-slate-50/70 p-4 dark:bg-zinc-800/70">
                                <div className="mb-3 flex items-center justify-between gap-2">
                                    <Badge variant="secondary" className="bg-blue-100 text-[#1a56db]">
                                        ช่อง {index + 1}
                                    </Badge>
                                    {image ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:text-red-600"
                                            onClick={() => updateImage(index, "")}
                                            disabled={!canEditSettings}
                                            aria-label={`ล้างรูปช่อง ${index + 1}`}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    ) : canRemoveSlot ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-500 hover:text-red-600"
                                            onClick={() => removeImageSlot(index)}
                                            disabled={!canRemoveSlot}
                                            aria-label={`ลบช่อง ${index + 1}`}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    ) : null}
                                </div>

                                <div className="relative aspect-square overflow-hidden rounded-xl border bg-white shadow-inner dark:bg-zinc-900">
                                    {image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={image} alt={`Welcome Strip ช่อง ${index + 1}`} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                                            <ImageIcon className="h-8 w-8" />
                                            <span className="text-sm">ยังไม่มีรูป</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 space-y-3">
                                    <input
                                        id={inputId}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        className="hidden"
                                        disabled={!canEditSettings || isUploading}
                                        onChange={(event) => handleUpload(index, event.target.files?.[0])}
                                    />
                                    <Label
                                        htmlFor={inputId}
                                        className={[
                                            "inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors",
                                            canEditSettings ? "hover:bg-accent hover:text-accent-foreground" : "cursor-not-allowed opacity-50",
                                        ].join(" ")}
                                    >
                                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                        {isUploading ? "กำลังอัพโหลด..." : "อัพโหลด / เปลี่ยนรูป"}
                                    </Label>

                                    <div className="space-y-2">
                                        <Label htmlFor={`${inputId}-url`}>URL รูปภาพ</Label>
                                        <Input
                                            id={`${inputId}-url`}
                                            value={image}
                                            onChange={(event) => updateImage(index, event.target.value)}
                                            placeholder="/uploads/..."
                                            disabled={!canEditSettings}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
