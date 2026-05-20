import { describe, expect, it } from "vitest";
import {
    getCenteredSquareCropRect,
    getExtensionFromMimeType,
    getNextSquareCropRect,
    getSquareCropHandlePosition,
    getSquareCropSourceRect,
    SQUARE_CROP_HANDLES,
} from "@/components/image-crop/squareCrop";

describe("components/image-crop/squareCrop", () => {
    it("keeps resize handle order and positions compatible with existing dialogs", () => {
        expect(SQUARE_CROP_HANDLES).toEqual(["nw", "ne", "sw", "se"]);
        expect(getSquareCropHandlePosition("nw")).toContain("cursor-nwse-resize");
        expect(getSquareCropHandlePosition("ne")).toContain("cursor-nesw-resize");
        expect(getSquareCropHandlePosition("sw")).toContain("cursor-nesw-resize");
        expect(getSquareCropHandlePosition("se")).toContain("cursor-nwse-resize");
    });

    it("builds the centered default crop rect with the previous 68 percent scale behavior", () => {
        const centeredRect = getCenteredSquareCropRect({ width: 400, height: 300 }, 80);
        expect(centeredRect.x).toBeCloseTo(98);
        expect(centeredRect.y).toBeCloseTo(48);
        expect(centeredRect.size).toBeCloseTo(204);
        expect(getCenteredSquareCropRect({ width: 90, height: 100 }, 80)).toEqual({
            x: 5,
            y: 10,
            size: 80,
        });
    });

    it("moves and clamps crop rects within the image dimensions", () => {
        expect(getNextSquareCropRect({
            current: { x: 40, y: 40, size: 220 },
            mode: "move",
            deltaX: 200,
            deltaY: -80,
            dimensions: { width: 300, height: 260 },
            minCropSize: 80,
        })).toEqual({ x: 80, y: 0, size: 220 });
    });

    it("resizes from every corner using the same anchor math", () => {
        const current = { x: 40, y: 50, size: 120 };
        const dimensions = { width: 300, height: 300 };

        expect(getNextSquareCropRect({ current, mode: "nw", deltaX: 20, deltaY: 10, dimensions, minCropSize: 80 }))
            .toEqual({ x: 60, y: 70, size: 100 });
        expect(getNextSquareCropRect({ current, mode: "ne", deltaX: 10, deltaY: -20, dimensions, minCropSize: 80 }))
            .toEqual({ x: 40, y: 30, size: 140 });
        expect(getNextSquareCropRect({ current, mode: "sw", deltaX: -20, deltaY: 10, dimensions, minCropSize: 80 }))
            .toEqual({ x: 20, y: 50, size: 140 });
        expect(getNextSquareCropRect({ current, mode: "se", deltaX: 20, deltaY: 10, dimensions, minCropSize: 80 }))
            .toEqual({ x: 40, y: 50, size: 140 });
    });

    it("maps displayed crop rects back to natural image source coordinates", () => {
        expect(getSquareCropSourceRect({
            cropRect: { x: 20, y: 30, size: 100 },
            naturalSize: { width: 1000, height: 800 },
            displaySize: { width: 500, height: 400 },
        })).toEqual({
            sourceX: 40,
            sourceY: 60,
            sourceSizeX: 200,
            sourceSizeY: 200,
        });
    });

    it("keeps image extension fallbacks used by profile crop export", () => {
        expect(getExtensionFromMimeType("image/png")).toBe("png");
        expect(getExtensionFromMimeType("image/jpeg")).toBe("jpg");
        expect(getExtensionFromMimeType("image/webp")).toBe("webp");
        expect(getExtensionFromMimeType("application/octet-stream")).toBe("png");
    });
});
