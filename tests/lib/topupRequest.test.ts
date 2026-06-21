import { describe, expect, it } from "vitest";
import {
    countTopupProofMethods,
    parseTopupRequestFormData,
    validateParsedTopupRequest,
    type ParsedTopupRequest,
} from "@/lib/features/topup/topupRequest";

function buildParsedTopupRequest(overrides: Partial<ParsedTopupRequest> = {}): ParsedTopupRequest {
    return {
        file: null,
        requestedAmount: 100,
        qrPayload: "payload",
        base64: null,
        imageUrl: null,
        remark: null,
        verifyTarget: "bank",
        pin: null,
        verifyMethod: "payload",
        providedMethods: 1,
        ...overrides,
    };
}

describe("topup request parser", () => {
    it("parses topup form fields and trims optional values", () => {
        const formData = new FormData();
        formData.set("amount", " 250.5 ");
        formData.set("qrPayload", " payload-data ");
        formData.set("remark", " note ");
        formData.set("provider", "wallet");
        formData.set("pin", " 123456 ");

        expect(parseTopupRequestFormData(formData)).toEqual({
            file: null,
            requestedAmount: 250.5,
            qrPayload: "payload-data",
            base64: null,
            imageUrl: null,
            remark: "note",
            verifyTarget: "truewallet",
            pin: "123456",
            verifyMethod: "payload",
            providedMethods: 1,
        });
    });

    it("falls back from qrPayload to payload and from file to image", () => {
        const image = new File(["image"], "slip.png", { type: "image/png" });
        const formData = new FormData();
        formData.set("amount", "100");
        formData.set("payload", "fallback-payload");

        expect(parseTopupRequestFormData(formData).qrPayload).toBe("fallback-payload");

        formData.delete("payload");
        formData.set("image", image);

        const parsed = parseTopupRequestFormData(formData);
        expect(parsed.file).toBe(image);
        expect(parsed.verifyMethod).toBe("image");
        expect(parsed.providedMethods).toBe(1);
    });

    it("ignores empty files and empty strings when counting methods", () => {
        const formData = new FormData();
        formData.set("amount", "100");
        formData.set("file", new File([], "empty.png", { type: "image/png" }));
        formData.set("base64", "   ");

        const parsed = parseTopupRequestFormData(formData);

        expect(parsed.file).toBeNull();
        expect(parsed.base64).toBeNull();
        expect(parsed.providedMethods).toBe(0);
    });

    it("counts provided topup proof methods", () => {
        expect(countTopupProofMethods({
            qrPayload: "payload",
            file: null,
            base64: null,
            imageUrl: null,
        })).toBe(1);
        expect(countTopupProofMethods({
            qrPayload: "payload",
            file: new File(["image"], "slip.png"),
            base64: "base64",
            imageUrl: "https://example.com/slip.png",
        })).toBe(4);
    });

    it("validates invalid amount before proof method errors", () => {
        expect(validateParsedTopupRequest(buildParsedTopupRequest({
            requestedAmount: null,
            providedMethods: 0,
            qrPayload: null,
            verifyMethod: "image",
        }))).toEqual({
            message: "กรุณากรอกจำนวนเงินที่โอนให้ถูกต้อง",
            status: 400,
        });
    });

    it("validates missing and duplicate proof methods with existing messages", () => {
        expect(validateParsedTopupRequest(buildParsedTopupRequest({
            qrPayload: null,
            verifyMethod: "image",
            providedMethods: 0,
        }))).toEqual({
            message: "กรุณาส่ง payload, image, base64 หรือ url อย่างใดอย่างหนึ่ง",
            status: 400,
        });

        expect(validateParsedTopupRequest(buildParsedTopupRequest({
            base64: "base64",
            providedMethods: 2,
        }))).toEqual({
            message: "ต้องระบุวิธีตรวจสลิปเพียง 1 อย่างเท่านั้น",
            status: 400,
        });
    });

    it("rejects TrueMoney Wallet payload verification with existing message", () => {
        expect(validateParsedTopupRequest(buildParsedTopupRequest({
            verifyTarget: "truewallet",
        }))).toEqual({
            message: "TrueMoney Wallet รองรับเฉพาะ image, base64 หรือ url",
            status: 400,
        });
    });

    it("rejects remarks longer than the EasySlip v2 remark limit", () => {
        expect(validateParsedTopupRequest(buildParsedTopupRequest({
            remark: "x".repeat(256),
        }))).toEqual({
            message: "หมายเหตุต้องไม่เกิน 255 ตัวอักษร",
            status: 400,
        });
    });

    it("accepts valid parsed topup requests", () => {
        expect(validateParsedTopupRequest(buildParsedTopupRequest())).toBeNull();
    });
});
