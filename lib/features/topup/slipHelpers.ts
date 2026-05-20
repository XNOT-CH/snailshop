export type EasySlipVerifyTarget = "bank" | "truewallet";

export type EasySlipV2VerifyInput =
    | { payload: string; remark?: string; expectedAmount?: number }
    | { image: File; remark?: string; expectedAmount?: number }
    | { base64: string; remark?: string; expectedAmount?: number }
    | { url: string; remark?: string; expectedAmount?: number };

export function parseTopupAmount(rawAmount: FormDataEntryValue | null) {
    if (typeof rawAmount !== "string" || !rawAmount.trim()) {
        return null;
    }

    const parsed = Number(rawAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

export function parseStringField(value: FormDataEntryValue | null) {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed || null;
}

export function parseVerifyTarget(value: string | null): EasySlipVerifyTarget {
    if (!value) {
        return "bank";
    }

    const normalized = value.trim().toLowerCase();
    return normalized === "truewallet" || normalized === "wallet" || normalized === "truemoney"
        ? "truewallet"
        : "bank";
}

export function getSlipVerifyMethod(
    qrPayload: string | null,
    base64: string | null,
    imageUrl: string | null,
) {
    if (qrPayload) {
        return "payload";
    }

    if (base64) {
        return "base64";
    }

    if (imageUrl) {
        return "url";
    }

    return "image";
}

export function getImageExtension(mimeType: string) {
    if (mimeType === "image/png") {
        return "png";
    }

    if (mimeType === "image/webp") {
        return "webp";
    }

    if (mimeType === "image/gif") {
        return "gif";
    }

    return "jpg";
}

export function createSlipProxy(phone?: string) {
    if (!phone) {
        return undefined;
    }

    return {
        type: "MSISDN",
        account: phone,
    };
}

export function withOptionalRemark<T extends EasySlipV2VerifyInput>(
    input: T,
    remark: string | null,
): T {
    return {
        ...input,
        remark: remark ?? undefined,
    } as T;
}

export function decodeBase64ImageSize(base64Value: string) {
    const normalized = base64Value.includes(",")
        ? base64Value.slice(base64Value.indexOf(",") + 1)
        : base64Value;
    const sanitized = normalized.replaceAll(/\s/g, "");

    if (!sanitized || !/^[A-Za-z0-9+/=]+$/.test(sanitized)) {
        throw new Error("INVALID_BASE64");
    }

    const buffer = Buffer.from(sanitized, "base64");
    if (!buffer.length) {
        throw new Error("INVALID_BASE64");
    }

    return buffer.length;
}

export function isPrivateOrBlockedHostname(hostname: string) {
    const normalized = hostname.toLowerCase();

    if (normalized === "localhost" || normalized === "127.0.0.1") {
        return true;
    }

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) {
        const parts = normalized.split(".").map(Number);
        const [a, b] = parts;

        if (a === 10 || a === 127 || a === 192 && b === 168) {
            return true;
        }

        if (a === 169 && b === 254) {
            return true;
        }

        if (a === 172 && b >= 16 && b <= 31) {
            return true;
        }
    }

    return false;
}

export function validatePublicImageUrl(rawUrl: string, maxLength = 2048) {
    if (rawUrl.length > maxLength) {
        throw new Error("INVALID_IMAGE_URL");
    }

    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new Error("INVALID_IMAGE_URL");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("INVALID_IMAGE_URL");
    }

    if (isPrivateOrBlockedHostname(parsed.hostname)) {
        throw new Error("BLOCKED_IMAGE_URL");
    }
}

export function mapSlipError(message: string | undefined) {
    const errorMessages: Record<string, string> = {
        unauthorized: "API key ไม่ถูกต้องหรือหมดอายุ",
        forbidden: "ไม่มีสิทธิ์เข้าถึง Endpoint นี้",
        quota_exceeded: "โควต้าตรวจสลิปหมด กรุณาลองใหม่ภายหลัง",
        invalid_payload: "Payload ไม่ถูกต้อง",
        invalid_image: "รูปภาพสลิปไม่ถูกต้อง",
        INVALID_IMAGE_FORMAT: "รูปแบบไฟล์รูปภาพไม่ถูกต้อง",
        invalid_url: "URL ของรูปภาพไม่ถูกต้อง",
        URL_PROTOCOL_NOT_ALLOWED: "อนุญาตเฉพาะ URL ที่เป็น HTTP หรือ HTTPS เท่านั้น",
        URL_INVALID_IP_RANGE: "URL นี้ชี้ไปยัง IP ที่ไม่อนุญาต",
        IMAGE_URL_UNREACHABLE: "ไม่สามารถเข้าถึง URL ของรูปภาพได้",
        INVALID_IMAGE_TYPE: "URL นี้ไม่ได้ชี้ไปยังไฟล์รูปภาพที่ถูกต้อง",
        image_size_too_large: "รูปภาพใหญ่เกินไป กรุณาลดขนาดให้ไม่เกิน 4 MB",
        IMAGE_SIZE_TOO_LARGE: "รูปภาพใหญ่เกินไป กรุณาลดขนาดให้ไม่เกิน 4 MB",
        qrcode_not_found: "ไม่พบ QR Code ในรูปภาพสลิป",
        slip_not_found: "ไม่พบสลิป หรือสลิปอาจเก่าเกินระยะเวลาที่ระบบตรวจสอบได้",
        slip_pending: "สลิปยังอยู่ระหว่างดำเนินการ กรุณาลองใหม่อีกครั้งภายใน 5 นาที",
        slip_expired: "สลิปหมดอายุ ไม่สามารถตรวจสอบได้",
        duplicate_slip: "สลิปนี้ถูกใช้ตรวจสอบไปแล้ว",
        invalid_request: "ข้อมูล Request ไม่ถูกต้อง",
        invalid_type: "ประเภท QR Code ไม่ถูกต้อง",
        invalid_msisdn: "เบอร์โทรศัพท์ไม่ถูกต้อง",
        invalid_natId: "เลขบัตรประชาชนไม่ถูกต้อง",
        invalid_ref1: "Reference 1 ไม่ถูกต้อง",
        account_not_match: "บัญชีผู้รับไม่ตรงกับข้อมูลที่คาดไว้",
        amount_not_match: "จำนวนเงินในสลิปไม่ตรงกับยอดที่คาดไว้",
    };

    if (!message) {
        return "เกิดข้อผิดพลาดในการตรวจสอบสลิป";
    }

    return errorMessages[message] || message;
}

export function mapEasySlipV2Error(code?: string, message?: string) {
    const errorMessages: Record<string, string> = {
        MISSING_API_KEY: "ไม่ได้ส่ง API key",
        INVALID_API_KEY: "API key ไม่ถูกต้อง",
        BRANCH_INACTIVE: "Branch ของ EasySlip ถูกปิดใช้งาน",
        SERVICE_BANNED: "บริการ EasySlip ถูกระงับ",
        USER_BANNED: "บัญชี EasySlip ถูกระงับ",
        IP_NOT_ALLOWED: "IP ของเซิร์ฟเวอร์ไม่ได้รับอนุญาต",
        QUOTA_EXCEEDED: "โควต้า EasySlip หมด",
        VALIDATION_ERROR: "ข้อมูลที่ส่งไปตรวจสอบไม่ถูกต้อง เช่น payload อาจไม่อยู่ในรูปแบบที่รองรับ",
        SLIP_NOT_FOUND: "ไม่พบสลิป หรือสลิปอาจเก่าเกินระยะเวลาที่ระบบตรวจสอบได้",
        SLIP_PENDING: "สลิปธนาคารกรุงเทพอาจยังประมวลผลไม่เสร็จ กรุณารอสักครู่แล้วลองใหม่อีกครั้ง",
        INVALID_IMAGE: "รูปภาพไม่ใช่สลิปที่ถูกต้อง",
        account_not_match: "บัญชีผู้รับไม่ตรงกับข้อมูลที่ลงทะเบียนไว้",
        ACCOUNT_NOT_MATCH: "บัญชีผู้รับไม่ตรงกับข้อมูลที่ลงทะเบียนไว้",
        amount_not_match: "จำนวนเงินในสลิปไม่ตรงกับยอดที่คาดไว้",
        AMOUNT_NOT_MATCH: "จำนวนเงินในสลิปไม่ตรงกับยอดที่คาดไว้",
        API_SERVER_ERROR: "ระบบ EasySlip ภายนอกมีปัญหา กรุณาลองใหม่อีกครั้ง",
    };

    if (code && errorMessages[code]) {
        return errorMessages[code];
    }

    return message || "ตรวจสอบสลิปไม่สำเร็จ";
}
