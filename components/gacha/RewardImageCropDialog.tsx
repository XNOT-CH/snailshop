"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crop, Move, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    getCenteredSquareCropRect,
    getNextSquareCropRect,
    getSquareCropHandlePosition,
    getSquareCropSourceRect,
    SQUARE_CROP_HANDLES,
    type SquareCropDragMode,
    type SquareCropRect,
} from "@/components/image-crop/squareCrop";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface RewardImageCropDialogProps {
    open: boolean;
    imageSrc: string | null;
    fileName: string;
    onClose: () => void;
    onConfirm: (file: File) => Promise<void> | void;
}

const MIN_CROP_SIZE = 80;
const PREVIEW_SIZE = 112;
const OUTPUT_SIZE = 768;
const CROPPED_IMAGE_TYPE = "image/png";

export function RewardImageCropDialog({
    open,
    imageSrc,
    fileName,
    onClose,
    onConfirm,
}: Readonly<RewardImageCropDialogProps>) {
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [cropRect, setCropRect] = useState<SquareCropRect>({ x: 40, y: 40, size: 220 });
    const [dragMode, setDragMode] = useState<SquareCropDragMode | null>(null);
    const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);

    const fileBaseName = useMemo(() => fileName.replace(/\.[^.]+$/, "") || "reward-image", [fileName]);

    useEffect(() => {
        if (!open) {
            setDragMode(null);
            setLastPoint(null);
            setIsSaving(false);
        }
    }, [open]);

    useEffect(() => {
        return () => {
            if (previewSrc) {
                URL.revokeObjectURL(previewSrc);
            }
        };
    }, [previewSrc]);

    const resetCropRect = () => {
        const image = imageRef.current;
        if (!image) {
            return;
        }

        setCropRect(getCenteredSquareCropRect({
            width: image.clientWidth,
            height: image.clientHeight,
        }, MIN_CROP_SIZE));
    };

    const updateCropRect = useCallback((clientX: number, clientY: number) => {
        if (!dragMode || !lastPoint) {
            return;
        }

        const deltaX = clientX - lastPoint.x;
        const deltaY = clientY - lastPoint.y;
        const image = imageRef.current;

        if (!image) {
            return;
        }

        setCropRect((current) => {
            return getNextSquareCropRect({
                current,
                mode: dragMode,
                deltaX,
                deltaY,
                dimensions: {
                    width: image.clientWidth,
                    height: image.clientHeight,
                },
                minCropSize: MIN_CROP_SIZE,
            });
        });

        setLastPoint({ x: clientX, y: clientY });
    }, [dragMode, lastPoint]);

    useEffect(() => {
        if (!dragMode) {
            return;
        }

        const handlePointerMove = (event: PointerEvent) => {
            updateCropRect(event.clientX, event.clientY);
        };

        const handlePointerUp = () => {
            setDragMode(null);
            setLastPoint(null);
        };

        globalThis.window.addEventListener("pointermove", handlePointerMove);
        globalThis.window.addEventListener("pointerup", handlePointerUp);

        return () => {
            globalThis.window.removeEventListener("pointermove", handlePointerMove);
            globalThis.window.removeEventListener("pointerup", handlePointerUp);
        };
    }, [dragMode, updateCropRect]);

    const beginDrag = (mode: SquareCropDragMode, event: React.PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setDragMode(mode);
        setLastPoint({ x: event.clientX, y: event.clientY });
    };

    const handleImageLoad = () => {
        if (!imageRef.current) {
            return;
        }

        setNaturalSize({
            width: imageRef.current.naturalWidth,
            height: imageRef.current.naturalHeight,
        });
        resetCropRect();
    };

    useEffect(() => {
        const image = imageRef.current;
        if (!image || !naturalSize.width || !naturalSize.height || !open) {
            return;
        }

        const { sourceX, sourceY, sourceSizeX, sourceSizeY } = getSquareCropSourceRect({
            cropRect,
            naturalSize,
            displaySize: {
                width: image.clientWidth,
                height: image.clientHeight,
            },
        });

        const canvas = globalThis.document.createElement("canvas");
        canvas.width = PREVIEW_SIZE;
        canvas.height = PREVIEW_SIZE;

        const context = canvas.getContext("2d");
        if (!context) {
            return;
        }

        context.drawImage(
            image,
            sourceX,
            sourceY,
            sourceSizeX,
            sourceSizeY,
            0,
            0,
            PREVIEW_SIZE,
            PREVIEW_SIZE,
        );

        canvas.toBlob((blob) => {
            if (!blob) {
                return;
            }

            setPreviewSrc((current) => {
                if (current) {
                    globalThis.URL.revokeObjectURL(current);
                }
                return globalThis.URL.createObjectURL(blob);
            });
        }, CROPPED_IMAGE_TYPE, 1);
    }, [cropRect, naturalSize, open]);

    const exportCroppedFile = async () => {
        const image = imageRef.current;
        if (!image || !naturalSize.width || !naturalSize.height) {
            return;
        }

        setIsSaving(true);

        try {
            const { sourceX, sourceY, sourceSizeX, sourceSizeY } = getSquareCropSourceRect({
                cropRect,
                naturalSize,
                displaySize: {
                    width: image.clientWidth,
                    height: image.clientHeight,
                },
            });

            const canvas = globalThis.document.createElement("canvas");
            canvas.width = OUTPUT_SIZE;
            canvas.height = OUTPUT_SIZE;

            const context = canvas.getContext("2d");
            if (!context) {
                throw new Error("Canvas context not available");
            }

            context.drawImage(
                image,
                sourceX,
                sourceY,
                sourceSizeX,
                sourceSizeY,
                0,
                0,
                canvas.width,
                canvas.height,
            );

            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, CROPPED_IMAGE_TYPE, 1),
            );

            if (!blob) {
                throw new Error("ไม่สามารถสร้างไฟล์รูปที่ครอปแล้วได้");
            }

            const croppedFile = new File([blob], `${fileBaseName}-cropped.png`, {
                type: CROPPED_IMAGE_TYPE,
                lastModified: Date.now(),
            });

            await onConfirm(croppedFile);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
            <DialogContent className="max-w-5xl rounded-3xl border-slate-200 bg-white p-0 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.4)] sm:max-w-5xl">
                <div className="overflow-hidden rounded-3xl">
                    <DialogHeader className="border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-sky-50 px-6 py-5 text-left">
                        <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_16px_30px_-18px_rgba(15,23,42,0.28)]">
                                <Crop className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                                <DialogTitle className="text-xl font-semibold text-slate-900">
                                    ครอปรูปรางวัล
                                </DialogTitle>
                                <DialogDescription className="text-sm text-slate-600">
                                    ลากกรอบวงกลมเพื่อจัดตำแหน่งรูปให้พอดีกับรางวัลก่อนอัปโหลด
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="grid gap-5 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_240px]">
                        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-3">
                            <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_55%),linear-gradient(180deg,_rgba(15,23,42,0.04),_rgba(15,23,42,0.08))] p-3">
                                {imageSrc ? (
                                    <div className="relative inline-block">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            ref={imageRef}
                                            src={imageSrc}
                                            alt="Preview crop"
                                            className="max-h-[68vh] w-auto max-w-full rounded-2xl object-contain shadow-[0_20px_60px_-30px_rgba(15,23,42,0.45)]"
                                            onLoad={handleImageLoad}
                                        />

                                        <div className="pointer-events-none absolute inset-0">
                                            <div
                                                className="pointer-events-auto absolute rounded-full border-[3px] border-white shadow-[0_0_0_9999px_rgba(15,23,42,0.48),0_18px_40px_-24px_rgba(15,23,42,0.92)]"
                                                style={{
                                                    left: cropRect.x,
                                                    top: cropRect.y,
                                                    width: cropRect.size,
                                                    height: cropRect.size,
                                                }}
                                                onPointerDown={(event) => beginDrag("move", event)}
                                            >
                                                <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Move className="h-3 w-3" />
                                                        ลากวงกลมได้
                                                    </span>
                                                </div>

                                                <div className="pointer-events-none absolute inset-[10%] rounded-full border border-white/55" />
                                                <div className="pointer-events-none absolute inset-[18%] rounded-full border border-white/20" />

                                                {SQUARE_CROP_HANDLES.map((handle) => {
                                                    return (
                                                        <button
                                                            key={handle}
                                                            type="button"
                                                            className={`absolute h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow ${getSquareCropHandlePosition(handle)}`}
                                                            onPointerDown={(event) => beginDrag(handle, event)}
                                                            aria-label={`Resize crop ${handle}`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="rounded-3xl border border-slate-200 bg-slate-50/90 p-4">
                                <p className="text-sm font-semibold text-slate-900">ตัวอย่างวงกลมรางวัล</p>
                                <p className="mt-1 text-xs text-slate-500">ภาพที่ครอปแล้วจะถูกแสดงแบบเต็มวงคล้ายหน้าเล่นจริง</p>
                                <div className="mt-4 flex justify-center">
                                    <div
                                        className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-amber-400 bg-white shadow-[0_12px_32px_-18px_rgba(15,23,42,0.28)]"
                                    >
                                        {previewSrc ? (
                                            <>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={previewSrc}
                                                    alt="Reward circle preview"
                                                    className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                                                />
                                                <div className="pointer-events-none absolute inset-[6px] rounded-full border border-white/35" />
                                            </>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-slate-50/90 p-4 text-sm text-slate-600">
                                <p className="font-medium text-slate-900">วิธีใช้งาน</p>
                                <p className="mt-2">ลากวงกลมเพื่อย้ายจุดโฟกัส และลากมุมทั้ง 4 เพื่อขยายหรือย่อพื้นที่ให้พอดีกับหน้ารางวัล</p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-4 h-11 w-full rounded-2xl border-slate-200 bg-white px-4"
                                    onClick={resetCropRect}
                                >
                                    <RefreshCcw className="mr-2 h-4 w-4" />
                                    รีเซ็ตกรอบครอป
                                </Button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="border-t border-slate-200 bg-white px-6 py-5 sm:justify-between">
                        <p className="text-sm text-slate-500">หลังครอปแล้ว ระบบจะย่อและบีบอัดรูปให้อัตโนมัติ</p>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 rounded-2xl border-slate-200 bg-white px-5"
                                onClick={onClose}
                                disabled={isSaving}
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                type="button"
                                className="h-11 rounded-2xl bg-blue-600 px-5 text-white hover:bg-blue-700"
                                onClick={exportCroppedFile}
                                disabled={isSaving || !imageSrc}
                            >
                                {isSaving ? "กำลังบันทึก..." : "ใช้รูปที่ครอปแล้ว"}
                            </Button>
                        </div>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
