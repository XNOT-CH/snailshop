"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crop, Move, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ResizeHandle = "nw" | "ne" | "sw" | "se";

interface CropRect {
  x: number;
  y: number;
  size: number;
}

interface FreeCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  fileName: string;
  onClose: () => void;
  onConfirm: (file: File) => Promise<void> | void;
}

const MIN_CROP_SIZE = 80;
const PREVIEW_SIZE = 112;
const CROPPED_IMAGE_TYPE = "image/png";

function getExtensionFromMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      return "png";
  }
}

export function FreeCropDialog({
  open,
  imageSrc,
  fileName,
  onClose,
  onConfirm,
}: FreeCropDialogProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [cropRect, setCropRect] = useState<CropRect>({ x: 40, y: 40, size: 220 });
  const [dragMode, setDragMode] = useState<"move" | ResizeHandle | null>(null);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  const fileBaseName = useMemo(() => fileName.replace(/\.[^.]+$/, "") || "profile-image", [fileName]);

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

    const size = Math.max(
      Math.min(Math.min(image.clientWidth, image.clientHeight) * 0.68, image.clientWidth, image.clientHeight),
      MIN_CROP_SIZE,
    );

    setCropRect({
      x: Math.max((image.clientWidth - size) / 2, 0),
      y: Math.max((image.clientHeight - size) / 2, 0),
      size,
    });
  };

  const clampCropRect = (nextRect: CropRect) => {
    const image = imageRef.current;
    if (!image) {
      return nextRect;
    }

    const maxSize = Math.min(image.clientWidth, image.clientHeight);
    const size = Math.max(Math.min(nextRect.size, maxSize), MIN_CROP_SIZE);
    const x = Math.min(Math.max(nextRect.x, 0), image.clientWidth - size);
    const y = Math.min(Math.max(nextRect.y, 0), image.clientHeight - size);

    return { x, y, size };
  };

  const updateCropRect = useCallback((clientX: number, clientY: number) => {
    if (!dragMode || !lastPoint) {
      return;
    }

    const deltaX = clientX - lastPoint.x;
    const deltaY = clientY - lastPoint.y;

    setCropRect((current) => {
      const nextRect = { ...current };

      if (dragMode === "move") {
        nextRect.x += deltaX;
        nextRect.y += deltaY;
      } else if (dragMode === "nw") {
        const anchorX = current.x + current.size;
        const anchorY = current.y + current.size;
        const resizeDelta = Math.max(deltaX, deltaY);
        nextRect.size = current.size - resizeDelta;
        nextRect.x = anchorX - nextRect.size;
        nextRect.y = anchorY - nextRect.size;
      } else if (dragMode === "ne") {
        const anchorX = current.x;
        const anchorY = current.y + current.size;
        const resizeDelta = Math.max(deltaX, -deltaY);
        nextRect.size = current.size + resizeDelta;
        nextRect.x = anchorX;
        nextRect.y = anchorY - nextRect.size;
      } else if (dragMode === "sw") {
        const anchorX = current.x + current.size;
        const anchorY = current.y;
        const resizeDelta = Math.max(-deltaX, deltaY);
        nextRect.size = current.size + resizeDelta;
        nextRect.x = anchorX - nextRect.size;
        nextRect.y = anchorY;
      } else if (dragMode === "se") {
        const resizeDelta = Math.max(deltaX, deltaY);
        nextRect.size = current.size + resizeDelta;
      }

      return clampCropRect(nextRect);
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

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragMode, updateCropRect]);

  const beginDrag = (mode: "move" | ResizeHandle, event: React.PointerEvent) => {
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

    const scaleX = naturalSize.width / image.clientWidth;
    const scaleY = naturalSize.height / image.clientHeight;
    const sourceX = cropRect.x * scaleX;
    const sourceY = cropRect.y * scaleY;
    const sourceSizeX = cropRect.size * scaleX;
    const sourceSizeY = cropRect.size * scaleY;

    const canvas = document.createElement("canvas");
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
          URL.revokeObjectURL(current);
        }
        return URL.createObjectURL(blob);
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
      const scaleX = naturalSize.width / image.clientWidth;
      const scaleY = naturalSize.height / image.clientHeight;
      const sourceX = cropRect.x * scaleX;
      const sourceY = cropRect.y * scaleY;
      const sourceSizeX = cropRect.size * scaleX;
      const sourceSizeY = cropRect.size * scaleY;

      const canvas = document.createElement("canvas");
      canvas.width = 768;
      canvas.height = 768;

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

      const outputMimeType = blob.type || CROPPED_IMAGE_TYPE;
      const croppedFile = new File([blob], `${fileBaseName}-cropped.${getExtensionFromMimeType(outputMimeType)}`, {
        type: outputMimeType,
        lastModified: Date.now(),
      });

      await onConfirm(croppedFile);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent className="w-[min(100%-0.75rem,72rem)] max-w-5xl overflow-hidden rounded-[28px] border-slate-200 bg-white p-0 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.4)] max-h-[calc(100vh-0.75rem)] sm:max-h-[calc(100vh-2rem)] sm:max-w-5xl">
        <div className="flex max-h-[calc(100vh-0.75rem)] flex-col overflow-hidden rounded-[28px] sm:max-h-[calc(100vh-2rem)]">
          <DialogHeader className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-sky-50 px-4 py-4 text-left sm:px-6 sm:py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_16px_30px_-18px_rgba(37,99,235,0.8)] sm:h-12 sm:w-12">
                <Crop className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-lg font-semibold text-slate-900 sm:text-xl">
                  ครอปรูปโปรไฟล์
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-600">
                  ลากกรอบวงกลมเพื่อจัดตำแหน่งรูปให้พอดีกับโปรไฟล์ก่อนอัปโหลด
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-5">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-2.5 sm:p-3">
              <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-[20px] bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_55%),linear-gradient(180deg,_rgba(15,23,42,0.04),_rgba(15,23,42,0.08))] p-2.5 sm:min-h-[320px] sm:p-3">
                {imageSrc ? (
                  <div className="relative inline-block touch-none select-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={imageRef}
                      src={imageSrc}
                      alt="Preview crop"
                      className="max-h-[46vh] w-auto max-w-full rounded-[22px] object-contain shadow-[0_20px_60px_-30px_rgba(15,23,42,0.45)] sm:max-h-[68vh]"
                      draggable={false}
                      onLoad={handleImageLoad}
                    />

                    <div className="pointer-events-none absolute inset-0">
                      <div
                        className="pointer-events-auto absolute touch-none rounded-full border-[3px] border-white shadow-[0_0_0_9999px_rgba(15,23,42,0.48),0_18px_40px_-24px_rgba(15,23,42,0.92)]"
                        style={{
                          left: cropRect.x,
                          top: cropRect.y,
                          width: cropRect.size,
                          height: cropRect.size,
                        }}
                        onPointerDown={(event) => beginDrag("move", event)}
                      >
                        <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white">
                          <span className="inline-flex items-center gap-1">
                            <Move className="h-3 w-3" />
                            ลากวงกลมได้
                          </span>
                        </div>

                        <div className="pointer-events-none absolute inset-[10%] rounded-full border border-white/55" />
                        <div className="pointer-events-none absolute inset-[18%] rounded-full border border-white/20" />

                        {(["nw", "ne", "sw", "se"] as ResizeHandle[]).map((handle) => {
                          const handlePosition =
                            handle === "nw"
                              ? "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize"
                              : handle === "ne"
                                ? "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize"
                                : handle === "sw"
                                  ? "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize"
                                  : "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize";

                          return (
                            <button
                              key={handle}
                              type="button"
                              className={`absolute h-5 w-5 touch-none rounded-full border-2 border-white bg-blue-600 shadow ${handlePosition}`}
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
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4">
                <p className="text-sm font-semibold text-slate-900">ตัวอย่างรูปโปรไฟล์</p>
                <p className="mt-1 text-xs text-slate-500">ภาพที่ครอปแล้วจะถูกแสดงแบบวงกลมเหมือนในเมนูผู้ใช้</p>
                <div className="mt-4 flex justify-center">
                  <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-amber-400 bg-white shadow-[0_12px_32px_-18px_rgba(251,191,36,0.9)]">
                    {previewSrc ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewSrc}
                          alt="Profile circle preview"
                          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                        />
                        <div className="pointer-events-none absolute inset-[6px] rounded-full border border-white/35" />
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4 text-sm text-slate-600">
                <p className="font-medium text-slate-900">วิธีใช้งาน</p>
                <p className="mt-2">ลากวงกลมเพื่อย้ายจุดโฟกัส และลากมุมทั้ง 4 เพื่อขยายหรือย่อพื้นที่ให้พอดีกับหน้ารูปโปรไฟล์</p>
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
          </div>

          <DialogFooter className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:justify-between sm:px-6 sm:py-5">
            <p className="text-sm text-slate-500">หลังครอปแล้ว ระบบจะย่อและบีบอัดรูปให้อัตโนมัติ</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-2xl border-slate-200 bg-white px-5 sm:w-auto"
                onClick={onClose}
                disabled={isSaving}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                className="h-11 w-full rounded-2xl bg-blue-600 px-5 text-white hover:bg-blue-700 sm:w-auto"
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
