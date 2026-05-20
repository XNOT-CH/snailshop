import {
    hasValidImageSignature,
    validateImageFile,
} from "@/lib/serverImageUpload";
import {
    decodeBase64ImageSize,
    validatePublicImageUrl,
    type EasySlipVerifyTarget,
} from "@/lib/features/topup/slipHelpers";

export const TOPUP_MAX_SLIP_BYTES = 4 * 1024 * 1024;
export const TOPUP_ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export interface TopupProofValidationError {
    message: string;
    status: 400;
}

export async function validateTopupProofInput(input: {
    file: File | null;
    base64: string | null;
    imageUrl: string | null;
    verifyTarget: EasySlipVerifyTarget;
}): Promise<TopupProofValidationError | null> {
    if (input.file) {
        validateImageFile(input.file, {
            allowedTypes: TOPUP_ALLOWED_IMAGE_TYPES,
            maxInputBytes: TOPUP_MAX_SLIP_BYTES,
            maxDimension: 1600,
            outputQuality: 82,
            preserveAnimation: false,
        });

        const originalBuffer = Buffer.from(await input.file.arrayBuffer());
        if (!hasValidImageSignature(input.file.type as (typeof TOPUP_ALLOWED_IMAGE_TYPES)[number], originalBuffer)) {
            return {
                message: "รูปสลิปไม่ถูกต้อง",
                status: 400,
            };
        }
    }

    if (input.base64) {
        try {
            const decodedBytes = decodeBase64ImageSize(input.base64);
            if (decodedBytes > TOPUP_MAX_SLIP_BYTES) {
                return {
                    message: "รูปภาพใหญ่เกินไป กรุณาลดขนาดให้ไม่เกิน 4 MB",
                    status: 400,
                };
            }
        } catch (error) {
            if (error instanceof Error && error.message === "INVALID_BASE64") {
                return {
                    message: "ข้อมูล Base64 ไม่ถูกต้อง",
                    status: 400,
                };
            }

            throw error;
        }
    }

    if (input.imageUrl) {
        try {
            validatePublicImageUrl(input.imageUrl, input.verifyTarget === "truewallet" ? 255 : 2048);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === "INVALID_IMAGE_URL") {
                    return {
                        message: "URL ของรูปภาพไม่ถูกต้อง",
                        status: 400,
                    };
                }

                if (error.message === "BLOCKED_IMAGE_URL") {
                    return {
                        message: "URL นี้ไม่อนุญาตให้ใช้งานสำหรับตรวจสลิป",
                        status: 400,
                    };
                }
            }

            throw error;
        }
    }

    return null;
}
