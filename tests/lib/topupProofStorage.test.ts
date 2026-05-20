import { beforeEach, describe, expect, it, vi } from "vitest";

const { saveOptimizedImageUploadMock } = vi.hoisted(() => ({
    saveOptimizedImageUploadMock: vi.fn(),
}));

vi.mock("@/lib/serverImageUpload", () => ({
    saveOptimizedImageUpload: saveOptimizedImageUploadMock,
}));

vi.mock("@/lib/slipStorage", () => ({
    PRIVATE_SLIP_PATH_PREFIX: "/private/slips",
    PRIVATE_SLIP_UPLOAD_DIR: "private/slips",
}));

import {
    TOPUP_ALLOWED_IMAGE_TYPES,
    TOPUP_MAX_SLIP_BYTES,
} from "@/lib/features/topup/topupProofValidation";
import { saveTopupProofImage } from "@/lib/features/topup/topupProofStorage";

describe("topup proof storage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("saves uploaded slip files with the existing topup upload options", async () => {
        const file = new File(["image"], "slip.png", { type: "image/png" });
        const savedSlip = {
            filename: "slip.webp",
            mimeType: "image/webp",
            url: "/private/slips/slip.webp",
        };
        saveOptimizedImageUploadMock.mockResolvedValue(savedSlip);

        const result = await saveTopupProofImage({
            file,
            imageUrl: null,
        });

        expect(saveOptimizedImageUploadMock).toHaveBeenCalledWith(file, {
            allowedTypes: TOPUP_ALLOWED_IMAGE_TYPES,
            maxInputBytes: TOPUP_MAX_SLIP_BYTES,
            maxDimension: 1600,
            outputQuality: 84,
            preserveAnimation: false,
            uploadDir: "private/slips",
            publicPath: "/private/slips",
        });
        expect(result).toEqual({
            savedSlip,
            proofImage: "/private/slips/slip.webp",
        });
    });

    it("prefers saved slip URLs over submitted image URLs", async () => {
        saveOptimizedImageUploadMock.mockResolvedValue({
            filename: "saved.webp",
            mimeType: "image/webp",
            url: "/private/slips/saved.webp",
        });

        await expect(saveTopupProofImage({
            file: new File(["image"], "slip.png", { type: "image/png" }),
            imageUrl: "https://example.com/slip.png",
        })).resolves.toEqual({
            savedSlip: {
                filename: "saved.webp",
                mimeType: "image/webp",
                url: "/private/slips/saved.webp",
            },
            proofImage: "/private/slips/saved.webp",
        });
    });

    it("uses submitted image URLs when no file was uploaded", async () => {
        await expect(saveTopupProofImage({
            file: null,
            imageUrl: "https://example.com/slip.png",
        })).resolves.toEqual({
            savedSlip: null,
            proofImage: "https://example.com/slip.png",
        });
        expect(saveOptimizedImageUploadMock).not.toHaveBeenCalled();
    });

    it("preserves null proof images when neither file nor URL exists", async () => {
        await expect(saveTopupProofImage({
            file: null,
            imageUrl: null,
        })).resolves.toEqual({
            savedSlip: null,
            proofImage: null,
        });
    });
});
