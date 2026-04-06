import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, users, topups } from "@/lib/db";
import { mysqlNow } from "@/lib/utils/date";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { checkTopupRateLimit, getClientIp } from "@/lib/rateLimit";
import { encryptTopupSensitiveFields } from "@/lib/sensitiveData";
import { PRIVATE_SLIP_PATH_PREFIX, PRIVATE_SLIP_UPLOAD_DIR } from "@/lib/slipStorage";
import {
    hasValidImageSignature,
    saveOptimizedImageUpload,
    validateImageFile,
} from "@/lib/serverImageUpload";

export const runtime = "nodejs";

const EASYSLIP_API_URL = "https://developer.easyslip.com/api/v1/verify";
const MAX_SLIP_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

interface SlipVerificationResult {
    status: number;
    message?: string;
    data?: {
        payload: string;
        transRef: string;
        date: string;
        countryCode: string;
        amount: { amount: number; local: { amount?: number; currency?: string } };
        fee?: number;
        ref1?: string;
        ref2?: string;
        ref3?: string;
        sender: {
            bank: { id?: string; name?: string; short?: string };
            account: { name: { th?: string; en?: string }; bank?: { type: string; account: string } };
        };
        receiver: {
            bank: { id: string; name?: string; short?: string };
            account: { name: { th?: string; en?: string }; bank?: { type: string; account: string } };
        };
    };
}

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

function getSlipDataUrl(file: File, buffer: Buffer) {
    return `data:${file.type};base64,${buffer.toString("base64")}`;
}

function mapSlipError(message: string | undefined) {
    const errorMessages: Record<string, string> = {
        invalid_payload: "เธฃเธนเธเธชเธฅเธดเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ เธเธฃเธธเธ“เธฒเธญเธฑเธเนเธซเธฅเธ”เธชเธฅเธดเธเนเธซเธกเน",
        invalid_image: "เธฃเธนเธเธชเธฅเธดเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ เธเธฃเธธเธ“เธฒเธญเธฑเธเนเธซเธฅเธ”เธชเธฅเธดเธเนเธซเธกเน",
        duplicate_slip: "เธชเธฅเธดเธเธเธตเนเน€เธเธขเนเธเนเนเธฅเนเธง เธเธฃเธธเธ“เธฒเนเธเนเธชเธฅเธดเธเนเธซเธกเน",
        image_size_too_large: "เธเธเธฒเธ”เธฃเธนเธเนเธซเธเนเน€เธเธดเธเนเธ เธเธฃเธธเธ“เธฒเธฅเธ”เธเธเธฒเธ”เธฃเธนเธ",
        slip_not_found: "เนเธกเนเธเธเธเนเธญเธกเธนเธฅเธชเธฅเธดเธเนเธเธฃเธฐเธเธเธเธเธฒเธเธฒเธฃ เธเธฃเธธเธ“เธฒเธ•เธฃเธงเธเธชเธญเธเธชเธฅเธดเธเธญเธตเธเธเธฃเธฑเนเธ",
        qrcode_not_found: "เนเธกเนเธเธเธเนเธญเธกเธนเธฅเธชเธฅเธดเธเนเธเธฃเธฐเธเธเธเธเธฒเธเธฒเธฃ เธเธฃเธธเธ“เธฒเธ•เธฃเธงเธเธชเธญเธเธชเธฅเธดเธเธญเธตเธเธเธฃเธฑเนเธ",
        unauthorized: "เธฃเธฐเธเธเธ•เธฃเธงเธเธชเธฅเธดเธเธเธฑเธ”เธเนเธญเธ เธเธฃเธธเธ“เธฒเธ•เธดเธ”เธ•เนเธญเนเธญเธ”เธกเธดเธ",
        quota_exceeded: "เธฃเธฐเธเธเธ•เธฃเธงเธเธชเธฅเธดเธเน€เธ•เนเธกเนเธเธงเธ•เธฒ เธเธฃเธธเธ“เธฒเธ•เธดเธ”เธ•เนเธญเนเธญเธ”เธกเธดเธ",
    };

    if (!message) {
        return "เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”เนเธเธเธฒเธฃเธ•เธฃเธงเธเธชเธญเธเธชเธฅเธดเธ";
    }

    return errorMessages[message] || message;
}

async function verifySlipWithEasySlip(file: File, dataUrl: string): Promise<SlipVerificationResult> {
    const token = process.env.EASYSLIP_TOKEN;
    if (!token) {
        throw new Error("EASYSLIP_NOT_CONFIGURED");
    }

    const base64Data = dataUrl.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.codePointAt(i) || 0;
    }

    const extension = file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
            ? "webp"
            : "jpg";

    const formData = new FormData();
    formData.append("file", new Blob([bytes], { type: file.type }), `slip.${extension}`);
    formData.append("checkDuplicate", "true");

    const response = await fetch(EASYSLIP_API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    return response.json() as Promise<SlipVerificationResult>;
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
            { success: false, message: "เธชเนเธเธเธณเธเธญเน€เธ•เธดเธกเน€เธเธดเธเธ–เธตเนเน€เธเธดเธเนเธ เธเธฃเธธเธ“เธฒเธฃเธญเธชเธฑเธเธเธฃเธนเนเนเธฅเนเธงเธฅเธญเธเนเธซเธกเนเธญเธตเธเธเธฃเธฑเนเธ" },
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
                { success: false, message: authCheck.error ?? "เธเธฃเธธเธ“เธฒเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธเนเธญเธ" },
                { status: 401 },
            );
        }

        const formData = await request.formData();
        const file = formData.get("file");
        const requestedAmount = parseAmount(formData.get("amount"));

        if (!(file instanceof File)) {
            return NextResponse.json({ success: false, message: "เธเธฃเธธเธ“เธฒเธญเธฑเธเนเธซเธฅเธ”เธชเธฅเธดเธเธเธฒเธฃเนเธญเธเน€เธเธดเธ" }, { status: 400 });
        }

        if (!requestedAmount) {
            return NextResponse.json({ success: false, message: "เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเธณเธเธงเธเน€เธเธดเธเธ—เธตเนเนเธญเธเนเธซเนเธ–เธนเธเธ•เนเธญเธ" }, { status: 400 });
        }

        validateImageFile(file, {
            allowedTypes: ALLOWED_IMAGE_TYPES,
            maxInputBytes: MAX_SLIP_BYTES,
            maxDimension: 1600,
            outputQuality: 82,
            preserveAnimation: false,
        });

        const originalBuffer = Buffer.from(await file.arrayBuffer());
        if (!hasValidImageSignature(file.type as (typeof ALLOWED_IMAGE_TYPES)[number], originalBuffer)) {
            return NextResponse.json({ success: false, message: "เธฃเธนเธเธชเธฅเธดเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ" }, { status: 400 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, authCheck.userId),
            columns: { id: true, creditBalance: true, totalTopup: true },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: "เนเธกเนเธเธเธเธนเนเนเธเนเธเธฒเธ" }, { status: 404 });
        }

        const slipDataUrl = getSlipDataUrl(file, originalBuffer);

        let verificationResult: SlipVerificationResult | null = null;
        let shouldFallbackToPending = false;

        try {
            verificationResult = await verifySlipWithEasySlip(file, slipDataUrl);
        } catch (error) {
            if (error instanceof Error && error.message === "EASYSLIP_NOT_CONFIGURED") {
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
                return NextResponse.json({ success: false, message: "เธชเธฅเธดเธเธเธตเนเน€เธเธขเนเธเนเน€เธ•เธดเธกเน€เธเธดเธเนเธฅเนเธง" }, { status: 400 });
            }
        }

        const savedSlip = await saveOptimizedImageUpload(file, {
            allowedTypes: ALLOWED_IMAGE_TYPES,
            maxInputBytes: MAX_SLIP_BYTES,
            maxDimension: 1600,
            outputQuality: 84,
            preserveAnimation: false,
            uploadDir: PRIVATE_SLIP_UPLOAD_DIR,
            publicPath: PRIVATE_SLIP_PATH_PREFIX,
        });

        const topupId = crypto.randomUUID();

        if (shouldFallbackToPending || !verificationResult?.data) {
            await db.insert(topups).values(encryptTopupSensitiveFields({
                id: topupId,
                userId: user.id,
                amount: String(requestedAmount),
                proofImage: savedSlip.url,
                status: "PENDING",
                createdAt: mysqlNow(),
            }));

            await auditFromRequest(request, {
                action: AUDIT_ACTIONS.TOPUP_REQUEST,
                resource: "TopupRequest",
                resourceId: topupId,
                resourceName: `เธฟ${requestedAmount.toLocaleString("th-TH")}`,
                details: {
                    amount: requestedAmount,
                    proofImageStored: Boolean(savedSlip.url),
                    status: "PENDING",
                    verification: "manual-review",
                },
            });

            return NextResponse.json({
                success: true,
                message: `เธชเนเธเธชเธฅเธดเธเธชเธณเน€เธฃเนเธ เธเธณเธเธงเธ เธฟ${requestedAmount.toLocaleString("th-TH")} เนเธฅเธฐเธฃเธญเนเธญเธ”เธกเธดเธเธ•เธฃเธงเธเธชเธญเธ`,
                data: {
                    topupId,
                    amount: requestedAmount,
                    status: "PENDING",
                    proofImage: savedSlip.url,
                },
            });
        }

        const verifiedAmount = verificationResult.data.amount?.amount || 0;
        if (verifiedAmount <= 0) {
            return NextResponse.json(
                { success: false, message: "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธญเนเธฒเธเธเธณเธเธงเธเน€เธเธดเธเธเธฒเธเธชเธฅเธดเธเนเธ”เน" },
                { status: 400 },
            );
        }

        await db.transaction(async (tx) => {
            await tx.insert(topups).values(encryptTopupSensitiveFields({
                id: topupId,
                userId: user.id,
                amount: String(verifiedAmount),
                proofImage: savedSlip.url,
                status: "APPROVED",
                transactionRef: verificationResult?.data?.transRef,
                senderName: verificationResult?.data?.sender?.account?.name?.th || null,
                senderBank: verificationResult?.data?.sender?.bank?.name || null,
                receiverName: verificationResult?.data?.receiver?.account?.name?.th || null,
                receiverBank: verificationResult?.data?.receiver?.bank?.name || null,
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
            resourceName: `เธฟ${verifiedAmount.toLocaleString("th-TH")}`,
            details: {
                amount: verifiedAmount,
                requestedAmount,
                transRef: verificationResult.data.transRef,
                senderNameStored: Boolean(verificationResult.data.sender?.account?.name?.th),
                proofImageStored: Boolean(savedSlip.url),
                status: "APPROVED",
                verification: "automatic",
            },
        });

        return NextResponse.json({
            success: true,
            message: `เน€เธ•เธดเธกเน€เธเธดเธเธชเธณเน€เธฃเนเธ! เนเธ”เนเธฃเธฑเธ เธฟ${verifiedAmount.toLocaleString("th-TH")}`,
            data: {
                topupId,
                amount: verifiedAmount,
                senderName: verificationResult.data.sender?.account?.name?.th,
                senderBank: verificationResult.data.sender?.bank?.name,
                transRef: verificationResult.data.transRef,
                proofImage: savedSlip.url,
                status: "APPROVED",
            },
        });
    } catch (error) {
        console.error("Topup error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ” เธเธฃเธธเธ“เธฒเธฅเธญเธเนเธซเธกเน" },
            { status: 500 },
        );
    }
}
