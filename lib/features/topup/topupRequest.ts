import {
    getSlipVerifyMethod,
    parseStringField,
    parseTopupAmount,
    parseVerifyTarget,
    type EasySlipVerifyTarget,
} from "@/lib/features/topup/slipHelpers";
import type { TopupVerifyMethod } from "@/lib/features/topup/topupBuilders";

export interface ParsedTopupRequest {
    file: File | null;
    requestedAmount: number | null;
    qrPayload: string | null;
    base64: string | null;
    imageUrl: string | null;
    remark: string | null;
    verifyTarget: EasySlipVerifyTarget;
    pin: string | null;
    verifyMethod: TopupVerifyMethod;
    providedMethods: number;
}

export interface TopupRequestValidationError {
    message: string;
    status: 400;
}

export function countTopupProofMethods(input: {
    qrPayload: string | null;
    file: File | null;
    base64: string | null;
    imageUrl: string | null;
}) {
    return [Boolean(input.qrPayload), Boolean(input.file), Boolean(input.base64), Boolean(input.imageUrl)]
        .filter(Boolean).length;
}

export function parseTopupRequestFormData(formData: FormData): ParsedTopupRequest {
    const fileEntry = formData.get("file") ?? formData.get("image");
    const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;
    const qrPayload = parseStringField(formData.get("qrPayload")) ?? parseStringField(formData.get("payload"));
    const base64 = parseStringField(formData.get("base64"));
    const imageUrl = parseStringField(formData.get("url"));
    const verifyTarget = parseVerifyTarget(
        parseStringField(formData.get("verifyType"))
        ?? parseStringField(formData.get("slipType"))
        ?? parseStringField(formData.get("provider")),
    );

    const parsed: ParsedTopupRequest = {
        file,
        requestedAmount: parseTopupAmount(formData.get("amount")),
        qrPayload,
        base64,
        imageUrl,
        remark: parseStringField(formData.get("remark")),
        verifyTarget,
        pin: parseStringField(formData.get("pin")),
        verifyMethod: getSlipVerifyMethod(qrPayload, base64, imageUrl),
        providedMethods: countTopupProofMethods({
            qrPayload,
            file,
            base64,
            imageUrl,
        }),
    };

    return parsed;
}

export function validateParsedTopupRequest(input: ParsedTopupRequest): TopupRequestValidationError | null {
    if (!input.requestedAmount) {
        return {
            message: "กรุณากรอกจำนวนเงินที่โอนให้ถูกต้อง",
            status: 400,
        };
    }

    if (input.providedMethods === 0) {
        return {
            message: "กรุณาส่ง payload, image, base64 หรือ url อย่างใดอย่างหนึ่ง",
            status: 400,
        };
    }

    if (input.providedMethods > 1) {
        return {
            message: "ต้องระบุวิธีตรวจสลิปเพียง 1 อย่างเท่านั้น",
            status: 400,
        };
    }

    if (input.verifyTarget === "truewallet" && input.qrPayload) {
        return {
            message: "TrueMoney Wallet รองรับเฉพาะ image, base64 หรือ url",
            status: 400,
        };
    }

    return null;
}
