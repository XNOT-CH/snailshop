import { describe, expect, it } from "vitest";
import {
    TOPUP_MAX_SLIP_BYTES,
    validateTopupProofInput,
} from "@/lib/features/topup/topupProofValidation";

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("topup proof validation", () => {
    it("accepts a file with a valid image signature", async () => {
        const file = new File([PNG_SIGNATURE], "slip.png", { type: "image/png" });

        await expect(validateTopupProofInput({
            file,
            base64: null,
            imageUrl: null,
            verifyTarget: "bank",
        })).resolves.toBeNull();
    });

    it("rejects a file with invalid image contents using the existing message", async () => {
        const file = new File(["not-a-png"], "slip.png", { type: "image/png" });

        await expect(validateTopupProofInput({
            file,
            base64: null,
            imageUrl: null,
            verifyTarget: "bank",
        })).resolves.toEqual({
            message: "รูปสลิปไม่ถูกต้อง",
            status: 400,
        });
    });

    it("keeps existing file type validation errors as thrown errors", async () => {
        const file = new File(["text"], "slip.txt", { type: "text/plain" });

        await expect(validateTopupProofInput({
            file,
            base64: null,
            imageUrl: null,
            verifyTarget: "bank",
        })).rejects.toThrow("Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.");
    });

    it("accepts valid base64 image data", async () => {
        await expect(validateTopupProofInput({
            file: null,
            base64: "aGVsbG8=",
            imageUrl: null,
            verifyTarget: "bank",
        })).resolves.toBeNull();
    });

    it("rejects invalid base64 with the existing message", async () => {
        await expect(validateTopupProofInput({
            file: null,
            base64: "not base64 !!!",
            imageUrl: null,
            verifyTarget: "bank",
        })).resolves.toEqual({
            message: "ข้อมูล Base64 ไม่ถูกต้อง",
            status: 400,
        });
    });

    it("rejects oversized base64 with the existing message", async () => {
        const oversizedBase64 = Buffer.alloc(TOPUP_MAX_SLIP_BYTES + 1).toString("base64");

        await expect(validateTopupProofInput({
            file: null,
            base64: oversizedBase64,
            imageUrl: null,
            verifyTarget: "bank",
        })).resolves.toEqual({
            message: "รูปภาพใหญ่เกินไป กรุณาลดขนาดให้ไม่เกิน 4 MB",
            status: 400,
        });
    });

    it("accepts valid public image URLs", async () => {
        await expect(validateTopupProofInput({
            file: null,
            base64: null,
            imageUrl: "https://example.com/slip.png",
            verifyTarget: "bank",
        })).resolves.toBeNull();
    });

    it("rejects invalid and blocked image URLs with existing messages", async () => {
        await expect(validateTopupProofInput({
            file: null,
            base64: null,
            imageUrl: "not-a-url",
            verifyTarget: "bank",
        })).resolves.toEqual({
            message: "URL ของรูปภาพไม่ถูกต้อง",
            status: 400,
        });

        await expect(validateTopupProofInput({
            file: null,
            base64: null,
            imageUrl: "http://localhost/slip.png",
            verifyTarget: "bank",
        })).resolves.toEqual({
            message: "URL นี้ไม่อนุญาตให้ใช้งานสำหรับตรวจสลิป",
            status: 400,
        });
    });

    it("uses the existing shorter TrueMoney Wallet URL length limit", async () => {
        const longWalletUrl = `https://example.com/${"a".repeat(260)}.png`;

        await expect(validateTopupProofInput({
            file: null,
            base64: null,
            imageUrl: longWalletUrl,
            verifyTarget: "truewallet",
        })).resolves.toEqual({
            message: "URL ของรูปภาพไม่ถูกต้อง",
            status: 400,
        });
    });
});
