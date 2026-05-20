import { describe, expect, it } from "vitest";
import {
    createSlipProxy,
    decodeBase64ImageSize,
    getImageExtension,
    getSlipVerifyMethod,
    isPrivateOrBlockedHostname,
    mapEasySlipV2Error,
    mapSlipError,
    parseStringField,
    parseTopupAmount,
    parseVerifyTarget,
    validatePublicImageUrl,
    withOptionalRemark,
} from "@/lib/features/topup/slipHelpers";

describe("topup slip helpers", () => {
    it("parses positive topup amounts only", () => {
        expect(parseTopupAmount("100")).toBe(100);
        expect(parseTopupAmount(" 50.5 ")).toBe(50.5);
        expect(parseTopupAmount("0")).toBeNull();
        expect(parseTopupAmount("-1")).toBeNull();
        expect(parseTopupAmount("abc")).toBeNull();
        expect(parseTopupAmount(null)).toBeNull();
    });

    it("trims string fields and normalizes empty values to null", () => {
        expect(parseStringField(" hello ")).toBe("hello");
        expect(parseStringField("   ")).toBeNull();
        expect(parseStringField(null)).toBeNull();
        expect(parseStringField(new File(["x"], "x.txt"))).toBeNull();
    });

    it("parses EasySlip verify target aliases", () => {
        expect(parseVerifyTarget(null)).toBe("bank");
        expect(parseVerifyTarget("bank")).toBe("bank");
        expect(parseVerifyTarget("truewallet")).toBe("truewallet");
        expect(parseVerifyTarget("wallet")).toBe("truewallet");
        expect(parseVerifyTarget("truemoney")).toBe("truewallet");
        expect(parseVerifyTarget("unknown")).toBe("bank");
    });

    it("detects the selected slip verify method by priority", () => {
        expect(getSlipVerifyMethod("payload", "base64", "https://example.com/slip.jpg")).toBe("payload");
        expect(getSlipVerifyMethod(null, "base64", "https://example.com/slip.jpg")).toBe("base64");
        expect(getSlipVerifyMethod(null, null, "https://example.com/slip.jpg")).toBe("url");
        expect(getSlipVerifyMethod(null, null, null)).toBe("image");
    });

    it("maps image MIME types to file extensions", () => {
        expect(getImageExtension("image/png")).toBe("png");
        expect(getImageExtension("image/webp")).toBe("webp");
        expect(getImageExtension("image/gif")).toBe("gif");
        expect(getImageExtension("image/jpeg")).toBe("jpg");
        expect(getImageExtension("application/octet-stream")).toBe("jpg");
    });

    it("creates TrueMoney proxy objects only when a phone exists", () => {
        expect(createSlipProxy()).toBeUndefined();
        expect(createSlipProxy("0812345678")).toEqual({
            type: "MSISDN",
            account: "0812345678",
        });
    });

    it("adds optional remarks without changing missing remark behavior", () => {
        expect(withOptionalRemark({ payload: "abc" }, "note")).toEqual({ payload: "abc", remark: "note" });
        expect(withOptionalRemark({ payload: "abc" }, null)).toEqual({ payload: "abc", remark: undefined });
    });

    it("decodes base64 image payload sizes and rejects invalid input", () => {
        expect(decodeBase64ImageSize("aGVsbG8=")).toBe(5);
        expect(decodeBase64ImageSize("data:image/png;base64,aGVsbG8=")).toBe(5);
        expect(() => decodeBase64ImageSize("")).toThrow("INVALID_BASE64");
        expect(() => decodeBase64ImageSize("not base64 !!!")).toThrow("INVALID_BASE64");
    });

    it("blocks localhost and private hostnames for public slip image URLs", () => {
        expect(isPrivateOrBlockedHostname("localhost")).toBe(true);
        expect(isPrivateOrBlockedHostname("127.0.0.1")).toBe(true);
        expect(isPrivateOrBlockedHostname("10.0.0.1")).toBe(true);
        expect(isPrivateOrBlockedHostname("172.16.0.1")).toBe(true);
        expect(isPrivateOrBlockedHostname("192.168.1.1")).toBe(true);
        expect(isPrivateOrBlockedHostname("example.com")).toBe(false);
    });

    it("validates public image URLs", () => {
        expect(() => validatePublicImageUrl("https://example.com/slip.jpg")).not.toThrow();
        expect(() => validatePublicImageUrl("ftp://example.com/slip.jpg")).toThrow("INVALID_IMAGE_URL");
        expect(() => validatePublicImageUrl("not-a-url")).toThrow("INVALID_IMAGE_URL");
        expect(() => validatePublicImageUrl("http://localhost/slip.jpg")).toThrow("BLOCKED_IMAGE_URL");
        expect(() => validatePublicImageUrl("https://example.com/slip.jpg", 10)).toThrow("INVALID_IMAGE_URL");
    });

    it("maps legacy EasySlip errors with fallback behavior", () => {
        expect(mapSlipError(undefined)).toBe("เกิดข้อผิดพลาดในการตรวจสอบสลิป");
        expect(mapSlipError("duplicate_slip")).toBe("สลิปนี้ถูกใช้ตรวจสอบไปแล้ว");
        expect(mapSlipError("custom_error")).toBe("custom_error");
    });

    it("maps EasySlip v2 errors with fallback behavior", () => {
        expect(mapEasySlipV2Error("INVALID_IMAGE")).toBe("รูปภาพไม่ใช่สลิปที่ถูกต้อง");
        expect(mapEasySlipV2Error(undefined, "custom message")).toBe("custom message");
        expect(mapEasySlipV2Error()).toBe("ตรวจสอบสลิปไม่สำเร็จ");
    });
});
