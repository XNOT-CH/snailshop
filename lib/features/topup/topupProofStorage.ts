import { saveOptimizedImageUpload } from "@/lib/serverImageUpload";
import { PRIVATE_SLIP_PATH_PREFIX, PRIVATE_SLIP_UPLOAD_DIR } from "@/lib/slipStorage";
import {
    TOPUP_ALLOWED_IMAGE_TYPES,
    TOPUP_MAX_SLIP_BYTES,
} from "@/lib/features/topup/topupProofValidation";

export interface TopupProofImageStorageResult {
    savedSlip: Awaited<ReturnType<typeof saveOptimizedImageUpload>> | null;
    proofImage: string | null;
}

export async function saveTopupProofImage(input: {
    file: File | null;
    imageUrl: string | null;
}): Promise<TopupProofImageStorageResult> {
    const savedSlip = input.file
        ? await saveOptimizedImageUpload(input.file, {
            allowedTypes: TOPUP_ALLOWED_IMAGE_TYPES,
            maxInputBytes: TOPUP_MAX_SLIP_BYTES,
            maxDimension: 1600,
            outputQuality: 84,
            preserveAnimation: false,
            uploadDir: PRIVATE_SLIP_UPLOAD_DIR,
            publicPath: PRIVATE_SLIP_PATH_PREFIX,
        })
        : null;

    return {
        savedSlip,
        proofImage: savedSlip?.url ?? input.imageUrl ?? null,
    };
}
