export const SQUARE_CROP_HANDLES = ["nw", "ne", "sw", "se"] as const;

export type SquareCropResizeHandle = typeof SQUARE_CROP_HANDLES[number];
export type SquareCropDragMode = "move" | SquareCropResizeHandle;

export interface SquareCropRect {
    x: number;
    y: number;
    size: number;
}

export interface SquareCropDimensions {
    width: number;
    height: number;
}

export interface SquareCropSourceRect {
    sourceX: number;
    sourceY: number;
    sourceSizeX: number;
    sourceSizeY: number;
}

const SQUARE_CROP_HANDLE_POSITIONS: Record<SquareCropResizeHandle, string> = {
    nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
    ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
    sw: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
    se: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
};

export function getExtensionFromMimeType(mimeType: string) {
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

export function getSquareCropHandlePosition(handle: SquareCropResizeHandle) {
    return SQUARE_CROP_HANDLE_POSITIONS[handle];
}

export function getCenteredSquareCropRect(
    dimensions: SquareCropDimensions,
    minCropSize: number,
    scale = 0.68
): SquareCropRect {
    const size = Math.max(
        Math.min(Math.min(dimensions.width, dimensions.height) * scale, dimensions.width, dimensions.height),
        minCropSize
    );

    return {
        x: Math.max((dimensions.width - size) / 2, 0),
        y: Math.max((dimensions.height - size) / 2, 0),
        size,
    };
}

export function clampSquareCropRect(
    nextRect: SquareCropRect,
    dimensions: SquareCropDimensions,
    minCropSize: number
): SquareCropRect {
    const maxSize = Math.min(dimensions.width, dimensions.height);
    const size = Math.max(Math.min(nextRect.size, maxSize), minCropSize);
    const x = Math.min(Math.max(nextRect.x, 0), dimensions.width - size);
    const y = Math.min(Math.max(nextRect.y, 0), dimensions.height - size);

    return { x, y, size };
}

export function getNextSquareCropRect({
    current,
    mode,
    deltaX,
    deltaY,
    dimensions,
    minCropSize,
}: {
    current: SquareCropRect;
    mode: SquareCropDragMode;
    deltaX: number;
    deltaY: number;
    dimensions: SquareCropDimensions;
    minCropSize: number;
}): SquareCropRect {
    const nextRect = { ...current };

    if (mode === "move") {
        nextRect.x += deltaX;
        nextRect.y += deltaY;
    } else if (mode === "nw") {
        const anchorX = current.x + current.size;
        const anchorY = current.y + current.size;
        const resizeDelta = Math.max(deltaX, deltaY);
        nextRect.size = current.size - resizeDelta;
        nextRect.x = anchorX - nextRect.size;
        nextRect.y = anchorY - nextRect.size;
    } else if (mode === "ne") {
        const anchorX = current.x;
        const anchorY = current.y + current.size;
        const resizeDelta = Math.max(deltaX, -deltaY);
        nextRect.size = current.size + resizeDelta;
        nextRect.x = anchorX;
        nextRect.y = anchorY - nextRect.size;
    } else if (mode === "sw") {
        const anchorX = current.x + current.size;
        const anchorY = current.y;
        const resizeDelta = Math.max(-deltaX, deltaY);
        nextRect.size = current.size + resizeDelta;
        nextRect.x = anchorX - nextRect.size;
        nextRect.y = anchorY;
    } else if (mode === "se") {
        const resizeDelta = Math.max(deltaX, deltaY);
        nextRect.size = current.size + resizeDelta;
    }

    return clampSquareCropRect(nextRect, dimensions, minCropSize);
}

export function getSquareCropSourceRect({
    cropRect,
    naturalSize,
    displaySize,
}: {
    cropRect: SquareCropRect;
    naturalSize: SquareCropDimensions;
    displaySize: SquareCropDimensions;
}): SquareCropSourceRect {
    const scaleX = naturalSize.width / displaySize.width;
    const scaleY = naturalSize.height / displaySize.height;

    return {
        sourceX: cropRect.x * scaleX,
        sourceY: cropRect.y * scaleY,
        sourceSizeX: cropRect.size * scaleX,
        sourceSizeY: cropRect.size * scaleY,
    };
}
