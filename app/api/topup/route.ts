import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, topups, users } from "@/lib/db";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { checkTopupRateLimit, getClientIp } from "@/lib/rateLimit";
import {
    hasValidImageSignature,
    saveOptimizedImageUpload,
    validateImageFile,
} from "@/lib/serverImageUpload";
import { encryptTopupSensitiveFields } from "@/lib/sensitiveData";
import { PRIVATE_SLIP_PATH_PREFIX, PRIVATE_SLIP_UPLOAD_DIR } from "@/lib/slipStorage";
import { mysqlNow } from "@/lib/utils/date";

export const runtime = "nodejs";

const EASYSLIP_API_URL = "https://developer.easyslip.com/api/v1/verify";
const EASYSLIP_V2_VERIFY_BANK_URL = "https://api.easyslip.com/v2/verify/bank";
const EASYSLIP_V2_VERIFY_TRUEWALLET_URL = "https://api.easyslip.com/v2/verify/truewallet";
const MAX_SLIP_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const TRUEWALLET_BANK = {
    id: "TRUEMONEYWALLET",
    name: "TrueMoney Wallet",
    short: "TRUEWALLET",
};

interface SlipPartyInfo {
    bank: { id?: string; name?: string; short?: string };
    account: {
        name: { th?: string; en?: string };
        bank?: { type?: string; account?: string };
        proxy?: { type?: string; account?: string };
    };
}

interface SlipVerificationData {
    payload: string;
    transRef: string;
    date: string;
    countryCode: string;
    amount: {
        amount: number;
        local: { amount?: number; currency?: string };
    };
    fee?: number;
    ref1?: string;
    ref2?: string;
    ref3?: string;
    sender: SlipPartyInfo;
    receiver: SlipPartyInfo & { merchantId?: string | null };
}

interface SlipVerificationResult {
    status: number;
    message?: string;
    data?: SlipVerificationData;
}

interface EasySlipV2Response {
    success: boolean;
    data?: {
        remark?: string;
        isDuplicate?: boolean;
        matchedAccount?: {
            bank?: {
                nameTh?: string;
                nameEn?: string;
                code?: string;
                shortCode?: string;
            };
            nameTh?: string;
            nameEn?: string;
            type?: "PERSONAL" | "JURISTIC";
            bankNumber?: string;
        } | null;
        amountInOrder?: number;
        amountInSlip?: number;
        isAmountMatched?: boolean;
        rawSlip?: {
            payload: string;
            transRef: string;
            date: string;
            countryCode: string;
            amount: {
                amount: number;
                local: { amount?: number; currency?: string };
            };
            fee?: number;
            ref1?: string;
            ref2?: string;
            ref3?: string;
            sender?: SlipPartyInfo;
            receiver?: SlipPartyInfo & { merchantId?: string | null };
        };
    };
    error?: {
        code?: string;
        message?: string;
    };
    message?: string;
}

interface EasySlipV2TrueWalletResponse {
    success: boolean;
    data?: {
        remark?: string;
        isDuplicate?: boolean;
        matchedAccount?: {
            bank?: {
                nameTh?: string;
                nameEn?: string;
                code?: string;
                shortCode?: string;
            };
            nameTh?: string;
            nameEn?: string;
            type?: "PERSONAL" | "JURISTIC";
            bankNumber?: string;
        } | null;
        amountInOrder?: number;
        amountInSlip?: number;
        isAmountMatched?: boolean;
        rawSlip?: {
            transactionId: string;
            date: string;
            amount: number;
            sender?: {
                name?: string;
            };
            receiver?: {
                name?: string;
                phone?: string;
            };
        };
    };
    error?: {
        code?: string;
        message?: string;
    };
    message?: string;
}

type EasySlipV2VerifyInput =
    | { payload: string; remark?: string; expectedAmount?: number }
    | { image: File; remark?: string; expectedAmount?: number }
    | { base64: string; remark?: string; expectedAmount?: number }
    | { url: string; remark?: string; expectedAmount?: number };

type EasySlipVerifyTarget = "bank" | "truewallet";

function parseAmount(rawAmount: FormDataEntryValue | null) {
    if (typeof rawAmount !== "string" || !rawAmount.trim()) {
        return null;
    }

    const parsed = Number(rawAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

function parseStringField(value: FormDataEntryValue | null) {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function parseVerifyTarget(value: string | null): EasySlipVerifyTarget {
    if (!value) {
        return "bank";
    }

    const normalized = value.trim().toLowerCase();
    return normalized === "truewallet" || normalized === "wallet" || normalized === "truemoney"
        ? "truewallet"
        : "bank";
}

function decodeBase64ImageSize(base64Value: string) {
    const normalized = base64Value.includes(",")
        ? base64Value.slice(base64Value.indexOf(",") + 1)
        : base64Value;
    const sanitized = normalized.replace(/\s/g, "");

    if (!sanitized || !/^[A-Za-z0-9+/=]+$/.test(sanitized)) {
        throw new Error("INVALID_BASE64");
    }

    const buffer = Buffer.from(sanitized, "base64");
    if (!buffer.length) {
        throw new Error("INVALID_BASE64");
    }

    return buffer.length;
}

function isPrivateOrBlockedHostname(hostname: string) {
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

function validatePublicImageUrl(rawUrl: string, maxLength = 2048) {
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

function mapSlipError(message: string | undefined) {
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

function mapEasySlipV2Error(code?: string, message?: string) {
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

async function verifySlipWithEasySlip(file: File): Promise<SlipVerificationResult> {
    const token = process.env.EASYSLIP_TOKEN;
    if (!token) {
        throw new Error("EASYSLIP_NOT_CONFIGURED");
    }

    const extension = file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
            ? "webp"
            : file.type === "image/gif"
                ? "gif"
                : "jpg";

    const formData = new FormData();
    formData.append("file", file, `slip.${extension}`);
    formData.append("checkDuplicate", "true");

    const response = await fetch(EASYSLIP_API_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    return response.json() as Promise<SlipVerificationResult>;
}

async function verifySlipWithEasySlipV2(
    input: EasySlipV2VerifyInput,
    target: EasySlipVerifyTarget = "bank",
): Promise<SlipVerificationResult> {
    const apiKey = process.env.EASYSLIP_API_KEY;
    if (!apiKey) {
        throw new Error("EASYSLIP_V2_NOT_CONFIGURED");
    }

    if (target === "truewallet" && "payload" in input) {
        return {
            status: 400,
            message: "TrueMoney Wallet does not support payload verification",
        };
    }

    let response: Response;
    const endpoint = target === "truewallet"
        ? EASYSLIP_V2_VERIFY_TRUEWALLET_URL
        : EASYSLIP_V2_VERIFY_BANK_URL;

    if ("image" in input) {
        const formData = new FormData();
        formData.append("image", input.image, input.image.name || "slip");
        formData.append("matchAccount", "true");
        formData.append("checkDuplicate", "true");
        if (typeof input.expectedAmount === "number" && Number.isFinite(input.expectedAmount) && input.expectedAmount > 0) {
            formData.append("matchAmount", String(input.expectedAmount));
        }
        if (input.remark) {
            formData.append("remark", input.remark);
        }

        response = await fetch(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            body: formData,
        });
    } else {
        const requestBody: Record<string, unknown> = {
            matchAccount: true,
            checkDuplicate: true,
        };

        if ("payload" in input) requestBody.payload = input.payload;
        if ("base64" in input) requestBody.base64 = input.base64;
        if ("url" in input) requestBody.url = input.url;
        if (typeof input.expectedAmount === "number" && Number.isFinite(input.expectedAmount) && input.expectedAmount > 0) {
            requestBody.matchAmount = input.expectedAmount;
        }
        if (input.remark) {
            requestBody.remark = input.remark;
        }

        response = await fetch(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });
    }

    const result = await response.json() as EasySlipV2Response | EasySlipV2TrueWalletResponse;

    if (!result.success) {
        return {
            status: response.status,
            message: mapEasySlipV2Error(result.error?.code, result.error?.message),
        };
    }

    if (target === "truewallet") {
        const walletResult = result as EasySlipV2TrueWalletResponse;
        const slip = walletResult.data?.rawSlip;
        if (!slip?.transactionId) {
            return {
                status: 400,
                message: "ข้อมูลสลิปไม่สมบูรณ์",
            };
        }

        return {
            status: 200,
            message: walletResult.message,
            data: {
                payload: "",
                transRef: slip.transactionId,
                date: slip.date,
                countryCode: "TH",
                amount: {
                    amount: slip.amount,
                    local: {
                        amount: slip.amount,
                        currency: "THB",
                    },
                },
                sender: {
                    bank: TRUEWALLET_BANK,
                    account: {
                        name: {
                            th: slip.sender?.name,
                        },
                    },
                },
                receiver: {
                    bank: TRUEWALLET_BANK,
                    account: {
                        name: {
                            th: slip.receiver?.name,
                        },
                        proxy: slip.receiver?.phone
                            ? {
                                type: "MSISDN",
                                account: slip.receiver.phone,
                            }
                            : undefined,
                    },
                },
            },
        };
    }

    const slip = (result as EasySlipV2Response).data?.rawSlip;
    if (!slip?.transRef) {
        return {
            status: 400,
            message: "ข้อมูลสลิปไม่สมบูรณ์",
        };
    }

    return {
        status: 200,
        message: result.message,
        data: {
            payload: slip.payload,
            transRef: slip.transRef,
            date: slip.date,
            countryCode: slip.countryCode,
            amount: slip.amount,
            fee: slip.fee,
            ref1: slip.ref1,
            ref2: slip.ref2,
            ref3: slip.ref3,
            sender: slip.sender ?? { bank: {}, account: { name: {} } },
            receiver: slip.receiver ?? { bank: {}, account: { name: {} } },
        },
    };
}

export async function POST(request: NextRequest) {
    const maintenance = getMaintenanceState("topup");
    if (maintenance.enabled) {
        return NextResponse.json(
            { success: false, message: maintenance.message },
            {
                status: 503,
                headers: {
                    "Retry-After": String(maintenance.retryAfterSeconds),
                },
            },
        );
    }

    const ip = getClientIp(request);
    const rateLimit = checkTopupRateLimit(ip);
    if (rateLimit.blocked) {
        return NextResponse.json(
            { success: false, message: "ส่งคำขอเติมเงินถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง" },
            {
                status: 429,
                headers: {
                    "Retry-After": String(Math.max(1, Math.ceil((rateLimit.retryAfter ?? 1000) / 1000))),
                },
            },
        );
    }

    try {
        const authCheck = await isAuthenticatedWithCsrf(request);
        if (!authCheck.success || !authCheck.userId) {
            return NextResponse.json(
                { success: false, message: authCheck.error ?? "กรุณาเข้าสู่ระบบก่อน" },
                { status: 401 },
            );
        }

        const formData = await request.formData();
        const fileEntry = formData.get("file") ?? formData.get("image");
        const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;
        const requestedAmount = parseAmount(formData.get("amount"));
        const qrPayload = parseStringField(formData.get("qrPayload")) ?? parseStringField(formData.get("payload"));
        const base64 = parseStringField(formData.get("base64"));
        const imageUrl = parseStringField(formData.get("url"));
        const remark = parseStringField(formData.get("remark"));
        const verifyTarget = parseVerifyTarget(
            parseStringField(formData.get("verifyType"))
            ?? parseStringField(formData.get("slipType"))
            ?? parseStringField(formData.get("provider")),
        );

        if (!requestedAmount) {
            return NextResponse.json(
                { success: false, message: "กรุณากรอกจำนวนเงินที่โอนให้ถูกต้อง" },
                { status: 400 },
            );
        }

        const providedMethods = [Boolean(qrPayload), Boolean(file), Boolean(base64), Boolean(imageUrl)].filter(Boolean).length;
        if (providedMethods === 0) {
            return NextResponse.json(
                { success: false, message: "กรุณาส่ง payload, image, base64 หรือ url อย่างใดอย่างหนึ่ง" },
                { status: 400 },
            );
        }

        if (providedMethods > 1) {
            return NextResponse.json(
                { success: false, message: "ต้องระบุวิธีตรวจสลิปเพียง 1 อย่างเท่านั้น" },
                { status: 400 },
            );
        }

        if (verifyTarget === "truewallet" && qrPayload) {
            return NextResponse.json(
                { success: false, message: "TrueMoney Wallet รองรับเฉพาะ image, base64 หรือ url" },
                { status: 400 },
            );
        }

        if (file) {
            validateImageFile(file, {
                allowedTypes: ALLOWED_IMAGE_TYPES,
                maxInputBytes: MAX_SLIP_BYTES,
                maxDimension: 1600,
                outputQuality: 82,
                preserveAnimation: false,
            });

            const originalBuffer = Buffer.from(await file.arrayBuffer());
            if (!hasValidImageSignature(file.type as (typeof ALLOWED_IMAGE_TYPES)[number], originalBuffer)) {
                return NextResponse.json(
                    { success: false, message: "รูปสลิปไม่ถูกต้อง" },
                    { status: 400 },
                );
            }
        }

        if (base64) {
            try {
                const decodedBytes = decodeBase64ImageSize(base64);
                if (decodedBytes > MAX_SLIP_BYTES) {
                    return NextResponse.json(
                        { success: false, message: "รูปภาพใหญ่เกินไป กรุณาลดขนาดให้ไม่เกิน 4 MB" },
                        { status: 400 },
                    );
                }
            } catch (error) {
                if (error instanceof Error && error.message === "INVALID_BASE64") {
                    return NextResponse.json(
                        { success: false, message: "ข้อมูล Base64 ไม่ถูกต้อง" },
                        { status: 400 },
                    );
                }

                throw error;
            }
        }

        if (imageUrl) {
            try {
                validatePublicImageUrl(imageUrl, verifyTarget === "truewallet" ? 255 : 2048);
            } catch (error) {
                if (error instanceof Error) {
                    if (error.message === "INVALID_IMAGE_URL") {
                        return NextResponse.json(
                            { success: false, message: "URL ของรูปภาพไม่ถูกต้อง" },
                            { status: 400 },
                        );
                    }

                    if (error.message === "BLOCKED_IMAGE_URL") {
                        return NextResponse.json(
                            { success: false, message: "URL นี้ไม่อนุญาตให้ใช้งานสำหรับตรวจสลิป" },
                            { status: 400 },
                        );
                    }
                }

                throw error;
            }
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, authCheck.userId),
            columns: {
                id: true,
                creditBalance: true,
                totalTopup: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, message: "ไม่พบผู้ใช้งาน" },
                { status: 404 },
            );
        }

        let verificationResult: SlipVerificationResult | null = null;
        let shouldFallbackToPending = false;

        try {
            if (qrPayload) {
                verificationResult = await verifySlipWithEasySlipV2({
                    payload: qrPayload,
                    expectedAmount: requestedAmount,
                    remark: remark || undefined,
                }, verifyTarget);
            } else if (base64) {
                verificationResult = await verifySlipWithEasySlipV2({
                    base64,
                    expectedAmount: requestedAmount,
                    remark: remark || undefined,
                }, verifyTarget);
            } else if (imageUrl) {
                verificationResult = await verifySlipWithEasySlipV2({
                    url: imageUrl,
                    expectedAmount: requestedAmount,
                    remark: remark || undefined,
                }, verifyTarget);
            } else if (file) {
                try {
                    verificationResult = await verifySlipWithEasySlipV2({
                        image: file,
                        expectedAmount: requestedAmount,
                        remark: remark || undefined,
                    }, verifyTarget);
                } catch (error) {
                    if (!(error instanceof Error) || error.message !== "EASYSLIP_V2_NOT_CONFIGURED") {
                        throw error;
                    }

                    verificationResult = await verifySlipWithEasySlip(file);
                }
            }
        } catch (error) {
            if (
                error instanceof Error
                && (error.message === "EASYSLIP_NOT_CONFIGURED" || error.message === "EASYSLIP_V2_NOT_CONFIGURED")
            ) {
                shouldFallbackToPending = true;
            } else {
                console.error("[TOPUP_EASYSLIP]", error);
                shouldFallbackToPending = true;
            }
        }

        if (!shouldFallbackToPending && verificationResult && verificationResult.status !== 200) {
            return NextResponse.json(
                { success: false, message: mapSlipError(verificationResult.message) },
                { status: 400 },
            );
        }

        if (!shouldFallbackToPending && verificationResult?.data?.transRef) {
            const existingTopup = await db.query.topups.findFirst({
                where: eq(topups.transactionRef, verificationResult.data.transRef),
                columns: { id: true },
            });

            if (existingTopup) {
                return NextResponse.json(
                    { success: false, message: "สลิปนี้เคยใช้เติมเงินแล้ว" },
                    { status: 400 },
                );
            }
        }

        const topupId = crypto.randomUUID();
        const savedSlip = file
            ? await saveOptimizedImageUpload(file, {
                allowedTypes: ALLOWED_IMAGE_TYPES,
                maxInputBytes: MAX_SLIP_BYTES,
                maxDimension: 1600,
                outputQuality: 84,
                preserveAnimation: false,
                uploadDir: PRIVATE_SLIP_UPLOAD_DIR,
                publicPath: PRIVATE_SLIP_PATH_PREFIX,
            })
            : null;

        if (shouldFallbackToPending || !verificationResult?.data) {
            await db.insert(topups).values(encryptTopupSensitiveFields({
                id: topupId,
                userId: user.id,
                amount: String(requestedAmount),
                proofImage: savedSlip?.url ?? imageUrl ?? null,
                status: "PENDING",
                createdAt: mysqlNow(),
            }));

            await auditFromRequest(request, {
                action: AUDIT_ACTIONS.TOPUP_REQUEST,
                resource: "TopupRequest",
                resourceId: topupId,
                resourceName: `฿${requestedAmount.toLocaleString("th-TH")}`,
                details: {
                    amount: requestedAmount,
                    proofImageStored: Boolean(savedSlip?.url ?? imageUrl),
                    status: "PENDING",
                    verification: "manual-review",
                    verifyMethod: qrPayload ? "payload" : base64 ? "base64" : imageUrl ? "url" : "image",
                    verifyTarget,
                },
            });

            return NextResponse.json({
                success: true,
                message: `ส่งสลิปสำเร็จ จำนวน ฿${requestedAmount.toLocaleString("th-TH")} และรอแอดมินตรวจสอบ`,
                data: {
                    topupId,
                    amount: requestedAmount,
                    status: "PENDING",
                    proofImage: savedSlip?.url ?? imageUrl ?? null,
                },
            });
        }

        const verifiedAmount = verificationResult.data.amount?.amount || 0;
        if (verifiedAmount <= 0) {
            return NextResponse.json(
                { success: false, message: "ไม่สามารถอ่านจำนวนเงินจากสลิปได้" },
                { status: 400 },
            );
        }

        await db.transaction(async (tx) => {
            await tx.insert(topups).values(encryptTopupSensitiveFields({
                id: topupId,
                userId: user.id,
                amount: String(verifiedAmount),
                proofImage: savedSlip?.url ?? imageUrl ?? null,
                status: "APPROVED",
                transactionRef: verificationResult.data.transRef,
                senderName: verificationResult.data.sender.account?.name?.th || null,
                senderBank: verificationResult.data.sender.bank?.name || null,
                receiverName: verificationResult.data.receiver.account?.name?.th || null,
                receiverBank: verificationResult.data.receiver.bank?.name || null,
                createdAt: mysqlNow(),
            }));

            await tx.update(users).set({
                creditBalance: sql`creditBalance + ${verifiedAmount}`,
                totalTopup: sql`totalTopup + ${verifiedAmount}`,
            }).where(eq(users.id, user.id));
        });

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.TOPUP_REQUEST,
            resource: "TopupRequest",
            resourceId: topupId,
            resourceName: `฿${verifiedAmount.toLocaleString("th-TH")}`,
            details: {
                amount: verifiedAmount,
                requestedAmount,
                transRef: verificationResult.data.transRef,
                senderNameStored: Boolean(verificationResult.data.sender.account?.name?.th),
                proofImageStored: Boolean(savedSlip?.url ?? imageUrl),
                status: "APPROVED",
                verification: "automatic",
                verifyMethod: qrPayload ? "payload" : base64 ? "base64" : imageUrl ? "url" : "image",
                verifyTarget,
            },
        });

        return NextResponse.json({
            success: true,
            message: `เติมเงินสำเร็จ! ได้รับ ฿${verifiedAmount.toLocaleString("th-TH")}`,
            data: {
                topupId,
                amount: verifiedAmount,
                senderName: verificationResult.data.sender.account?.name?.th,
                senderBank: verificationResult.data.sender.bank?.name,
                transRef: verificationResult.data.transRef,
                proofImage: savedSlip?.url ?? imageUrl ?? null,
                status: "APPROVED",
            },
        });
    } catch (error) {
        console.error("Topup error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่" },
            { status: 500 },
        );
    }
}
