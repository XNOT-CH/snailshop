"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  width: number;
  height: number;
}

interface FreeCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  fileName: string;
  onClose: () => void;
  onConfirm: (file: File) => Promise<void> | void;
}

const MIN_CROP_SIZE = 60;

export function FreeCropDialog({
  open,
  imageSrc,
  fileName,
  onClose,
  onConfirm,
}: FreeCropDialogProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [cropRect, setCropRect] = useState<CropRect>({ x: 40, y: 40, width: 220, height: 220 });
  const [dragMode, setDragMode] = useState<"move" | ResizeHandle | null>(null);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const fileBaseName = useMemo(() => fileName.replace(/\.[^.]+$/, "") || "profile-image", [fileName]);

  useEffect(() => {
    if (!open) {
      setDragMode(null);
      setLastPoint(null);
      setIsSaving(false);
    }
  }, [open]);

  const resetCropRect = () => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    const width = Math.max(image.clientWidth * 0.62, MIN_CROP_SIZE);
    const height = Math.max(image.clientHeight * 0.62, MIN_CROP_SIZE);
    setCropRect({
      x: Math.max((image.clientWidth - width) / 2, 0),
      y: Math.max((image.clientHeight - height) / 2, 0),
      width: Math.min(width, image.clientWidth),
      height: Math.min(height, image.clientHeight),
    });
  };

  const clampCropRect = (nextRect: CropRect) => {
    const image = imageRef.current;
    if (!image) {
      return nextRect;
    }

    const maxWidth = image.clientWidth;
    const maxHeight = image.clientHeight;

    let width = Math.max(Math.min(nextRect.width, maxWidth), MIN_CROP_SIZE);
    let height = Math.max(Math.min(nextRect.height, maxHeight), MIN_CROP_SIZE);
    let x = Math.min(Math.max(nextRect.x, 0), maxWidth - width);
    let y = Math.min(Math.max(nextRect.y, 0), maxHeight - height);

    if (x + width > maxWidth) {
      width = maxWidth - x;
    }

    if (y + height > maxHeight) {
      height = maxHeight - y;
    }

    return {
      x,
      y,
      width: Math.max(width, MIN_CROP_SIZE),
      height: Math.max(height, MIN_CROP_SIZE),
    };
  };

  const updateCropRect = (clientX: number, clientY: number) => {
    if (!dragMode || !lastPoint) {
      return;
    }

    const deltaX = clientX - lastPoint.x;
    const deltaY = clientY - lastPoint.y;

    setCropRect((current) => {
      let nextRect = { ...current };

      if (dragMode === "move") {
        nextRect.x += deltaX;
        nextRect.y += deltaY;
      } else if (dragMode === "nw") {
        nextRect.x += deltaX;
        nextRect.y += deltaY;
        nextRect.width -= deltaX;
        nextRect.height -= deltaY;
      } else if (dragMode === "ne") {
        nextRect.y += deltaY;
        nextRect.width += deltaX;
        nextRect.height -= deltaY;
      } else if (dragMode === "sw") {
        nextRect.x += deltaX;
        nextRect.width -= deltaX;
        nextRect.height += deltaY;
      } else if (dragMode === "se") {
        nextRect.width += deltaX;
        nextRect.height += deltaY;
      }

      return clampCropRect(nextRect);
    });

    setLastPoint({ x: clientX, y: clientY });
  };

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
  }, [dragMode, lastPoint]);

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

  const exportCroppedFile = async () => {
    const image = imageRef.current;
    if (!image || !naturalSize.width || !naturalSize.height) {
      return;
    }

    setIsSaving(true);

    try {
      const displayWidth = image.clientWidth;
      const displayHeight = image.clientHeight;
      const scaleX = naturalSize.width / displayWidth;
      const scaleY = naturalSize.height / displayHeight;
      const sourceX = cropRect.x * scaleX;
      const sourceY = cropRect.y * scaleY;
      const sourceWidth = cropRect.width * scaleX;
      const sourceHeight = cropRect.height * scaleY;

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(Math.round(sourceWidth), 1);
      canvas.height = Math.max(Math.round(sourceHeight), 1);

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas context not available");
      }

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 1),
      );

      if (!blob) {
        throw new Error("ไม่สามารถสร้างไฟล์รูปที่ครอปแล้วได้");
      }

      const croppedFile = new File([blob], `${fileBaseName}-cropped.png`, {
        type: "image/png",
        lastModified: Date.now(),
      });

      await onConfirm(croppedFile);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent className="max-w-4xl rounded-[28px] border-slate-200 bg-white p-0 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.4)] sm:max-w-4xl">
        <div className="overflow-hidden rounded-[28px]">
          <DialogHeader className="border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-sky-50 px-6 py-5 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_16px_30px_-18px_rgba(37,99,235,0.8)]">
                <Crop className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-semibold text-slate-900">
                  ครอปอิสระ (Free Crop)
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-600">
                  ลากกรอบเอง ปรับขนาดตามใจ เหมาะกับผู้ใช้ทั่วไป
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 px-6 py-6">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-3">
              <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-[20px] bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_55%),linear-gradient(180deg,_rgba(15,23,42,0.04),_rgba(15,23,42,0.08))] p-3">
                {imageSrc ? (
                  <div className="relative inline-block">
                    <img
                      ref={imageRef}
                      src={imageSrc}
                      alt="Preview crop"
                      className="max-h-[68vh] w-auto max-w-full rounded-2xl object-contain shadow-[0_20px_60px_-30px_rgba(15,23,42,0.45)]"
                      onLoad={handleImageLoad}
                    />

                    <div className="pointer-events-none absolute inset-0">
                      <div
                        className="pointer-events-auto absolute border-2 border-white shadow-[0_0_0_9999px_rgba(15,23,42,0.42),0_14px_40px_-24px_rgba(15,23,42,0.9)]"
                        style={{
                          left: cropRect.x,
                          top: cropRect.y,
                          width: cropRect.width,
                          height: cropRect.height,
                        }}
                        onPointerDown={(event) => beginDrag("move", event)}
                      >
                        <div className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white">
                          <span className="inline-flex items-center gap-1">
                            <Move className="h-3 w-3" />
                            ลากกรอบได้
                          </span>
                        </div>

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
                              className={`absolute h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow ${handlePosition}`}
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

            <div className="flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-slate-50/90 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-slate-900">โหมดครอปอิสระ</p>
                <p>ลากกรอบเพื่อย้าย และลากจุดมุมทั้ง 4 เพื่อปรับขนาดได้อย่างอิสระ</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-2xl border-slate-200 bg-white px-4"
                onClick={resetCropRect}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                รีเซ็ตกรอบครอป
              </Button>
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
