import {
    verifySlipWithEasySlip,
    verifySlipWithEasySlipV2,
    type SlipVerificationResult,
} from "@/lib/features/topup/easySlipService";
import {
    withOptionalRemark,
    type EasySlipVerifyTarget,
} from "@/lib/features/topup/slipHelpers";

export interface TopupVerificationFlowResult {
    verificationResult: SlipVerificationResult | null;
    shouldFallbackToPending: boolean;
}

export async function verifyTopupSlip(input: {
    qrPayload: string | null;
    base64: string | null;
    imageUrl: string | null;
    file: File | null;
    requestedAmount: number;
    remark: string | null;
    verifyTarget: EasySlipVerifyTarget;
}): Promise<TopupVerificationFlowResult> {
    let verificationResult: SlipVerificationResult | null = null;
    let shouldFallbackToPending = false;

    try {
        if (input.qrPayload) {
            verificationResult = await verifySlipWithEasySlipV2({
                ...withOptionalRemark({
                    payload: input.qrPayload,
                    expectedAmount: input.requestedAmount,
                }, input.remark),
            }, input.verifyTarget);
        } else if (input.base64) {
            verificationResult = await verifySlipWithEasySlipV2({
                ...withOptionalRemark({
                    base64: input.base64,
                    expectedAmount: input.requestedAmount,
                }, input.remark),
            }, input.verifyTarget);
        } else if (input.imageUrl) {
            verificationResult = await verifySlipWithEasySlipV2({
                ...withOptionalRemark({
                    url: input.imageUrl,
                    expectedAmount: input.requestedAmount,
                }, input.remark),
            }, input.verifyTarget);
        } else if (input.file) {
            try {
                verificationResult = await verifySlipWithEasySlipV2({
                    ...withOptionalRemark({
                        image: input.file,
                        expectedAmount: input.requestedAmount,
                    }, input.remark),
                }, input.verifyTarget);
            } catch (error) {
                if (!(error instanceof Error) || error.message !== "EASYSLIP_V2_NOT_CONFIGURED") {
                    throw error;
                }

                verificationResult = await verifySlipWithEasySlip(input.file);
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

    return {
        verificationResult,
        shouldFallbackToPending,
    };
}
