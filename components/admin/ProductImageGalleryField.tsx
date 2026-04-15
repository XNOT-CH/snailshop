"use client";

import React, { useRef, useState } from "react";
import { GripVertical, ImagePlus, Loader2, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compressImage } from "@/lib/compressImage";
import { IMAGE_UPLOAD_RECOMMENDATIONS } from "@/lib/imageUploadRecommendations";
import { showError, showSuccess } from "@/lib/swal";

type ProductImageGalleryFieldProps = {
    images: string[];
    disabled?: boolean;
    onChange: (images: string[]) => void;
};

function uniqImages(images: string[]) {
    return Array.from(new Set(images.map((image) => image.trim()).filter(Boolean)));
}

export function ProductImageGalleryField({
    images,
    disabled = false,
    onChange,
}: Readonly<ProductImageGalleryFieldProps>) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [urlInput, setUrlInput] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    const addImages = (nextImages: string[]) => {
        onChange(uniqImages([...images, ...nextImages]));
    };

    const handleAddUrl = () => {
        if (disabled) return;

        const trimmedUrl = urlInput.trim();
        if (!trimmedUrl) {
            showError("กรุณากรอกลิงก์รูปภาพ");
            return;
        }

        addImages([trimmedUrl]);
        setUrlInput("");
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;

        const files = Array.from(event.target.files ?? []);
        if (files.length === 0) {
            return;
        }

        setIsUploading(true);
        try {
            const uploadedUrls: string[] = [];

            for (const file of files) {
                const compressed = await compressImage(file);
                const uploadFormData = new FormData();
                uploadFormData.append("file", compressed);

                const response = await fetch("/api/upload", {
                    method: "POST",
                    body: uploadFormData,
                });
                const data = await response.json();

                if (!data.success || !data.url) {
                    throw new Error(data.message || "อัปโหลดรูปไม่สำเร็จ");
                }

                uploadedUrls.push(data.url);
            }

            addImages(uploadedUrls);
            showSuccess(`เพิ่มรูปสำเร็จ ${uploadedUrls.length} รูป`);
        } catch (error) {
            console.error("[PRODUCT_IMAGE_UPLOAD]", error);
            showError(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปโหลด");
        } finally {
            event.target.value = "";
            setIsUploading(false);
        }
    };

    const handleRemove = (index: number) => {
        if (disabled) return;
        onChange(images.filter((_, currentIndex) => currentIndex !== index));
    };

    const handleMove = (index: number, direction: -1 | 1) => {
        if (disabled) return;

        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= images.length) {
            return;
        }

        const nextImages = [...images];
        [nextImages[index], nextImages[nextIndex]] = [nextImages[nextIndex], nextImages[index]];
        onChange(nextImages);
    };

    return (
        <div className="space-y-4">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                <div className="relative aspect-[4/3] w-full">
                    {images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={images[0]}
                            alt="Preview"
                            className="h-full w-full object-cover"
                            onError={(event) => {
                                (event.target as HTMLImageElement).src =
                                    "https://placehold.co/400x300/f1f5f9/64748b?text=Invalid+URL";
                            }}
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_55%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 text-center">
                            <div className="space-y-2">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/90 shadow-sm ring-1 ring-slate-200">
                                    <ImagePlus className="h-6 w-6 text-sky-600" />
                                </div>
                                <p className="text-sm font-medium text-slate-700">ยังไม่มีรูปสินค้า</p>
                                <p className="text-xs text-slate-500">อัปโหลดได้หลายรูป และรูปแรกจะเป็นรูปหลัก</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={disabled}
                    onChange={handleUpload}
                />
                <Button
                    type="button"
                    variant="outline"
                    className="h-11 justify-center gap-2 rounded-xl border-slate-300 bg-white"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isUploading}
                >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {isUploading ? "กำลังอัปโหลด..." : "อัปโหลดจากเครื่อง"}
                </Button>

                {images.length > 0 && (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onChange([])}
                        disabled={disabled}
                        className="h-11 gap-2 rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    >
                        <Trash2 className="h-4 w-4" />
                        ล้างรูปทั้งหมด
                    </Button>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="image-url-input">ลิงก์รูปภาพ</Label>
                <div className="flex gap-2">
                    <Input
                        id="image-url-input"
                        placeholder="วาง URL รูปภาพแล้วกดเพิ่ม"
                        value={urlInput}
                        onChange={(event) => setUrlInput(event.target.value)}
                        disabled={disabled}
                        className="bg-white"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        className="shrink-0 rounded-xl"
                        onClick={handleAddUrl}
                        disabled={disabled || !urlInput.trim()}
                    >
                        เพิ่มรูป
                    </Button>
                </div>
            </div>

            {images.length > 0 && (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-800">รายการรูปสินค้า</p>
                        <p className="text-xs text-slate-500">รูปแรกจะใช้เป็นภาพหลักในหน้ารวมสินค้า</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {images.map((image, index) => (
                            <div
                                key={`${image}-${index}`}
                                className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                            >
                                <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={image}
                                        alt={`รูปสินค้า ${index + 1}`}
                                        className="h-full w-full object-cover"
                                        onError={(event) => {
                                            (event.target as HTMLImageElement).src =
                                                "https://placehold.co/300x300/f1f5f9/64748b?text=Invalid+URL";
                                        }}
                                    />
                                </div>

                                <div className="mt-3 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <GripVertical className="h-3.5 w-3.5" />
                                        รูปที่ {index + 1}
                                        {index === 0 && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                                                <Star className="h-3 w-3" />
                                                หลัก
                                            </span>
                                        )}
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                        onClick={() => handleRemove(index)}
                                        disabled={disabled}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                <div className="mt-2 flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 rounded-xl"
                                        onClick={() => handleMove(index, -1)}
                                        disabled={disabled || index === 0}
                                    >
                                        เลื่อนซ้าย
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 rounded-xl"
                                        onClick={() => handleMove(index, 1)}
                                        disabled={disabled || index === images.length - 1}
                                    >
                                        เลื่อนขวา
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs leading-relaxed text-slate-500">
                รองรับ JPG, PNG, WebP, GIF สูงสุด 5MB ระบบจะย่อ บีบอัด และแปลงไฟล์ให้อัตโนมัติก่อนบันทึก • {IMAGE_UPLOAD_RECOMMENDATIONS.productSquare}
            </div>
        </div>
    );
}
