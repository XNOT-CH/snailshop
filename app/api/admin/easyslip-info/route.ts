import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

interface InfoResponse {
    success: true;
    data: InfoData;
    message: string;
}

interface InfoData {
    application: Application;
    branch: Branch;
    account: Account;
    product: Product;
}

interface Application {
    name: string;
    autoRenew: AutoRenew;
    quota: ApplicationQuota;
}

interface AutoRenew {
    expired: boolean;
    quota: boolean;
    createdAt: string;
    expiresAt: string;
}

interface ApplicationQuota {
    used: number;
    max: number | null;
    remaining: number | null;
    totalUsed: number;
}

interface Branch {
    name: string;
    isActive: boolean;
    quota: BranchQuota;
}

interface BranchQuota {
    used: number;
    totalUsed: number;
}

interface Account {
    email: string;
    credit: number;
}

interface Product {
    name: string;
}

interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
    };
}

function mapEasySlipInfoError(code?: string, message?: string) {
    const errorMessages: Record<string, string> = {
        MISSING_API_KEY: "ไม่ได้ส่ง API key",
        INVALID_API_KEY: "API key ไม่ถูกต้อง",
        IP_NOT_ALLOWED: "IP ของเซิร์ฟเวอร์ไม่ได้รับอนุญาต",
        BRANCH_INACTIVE: "Branch ของ EasySlip ถูกปิดใช้งาน",
        QUOTA_EXCEEDED: "โควต้า EasySlip หมด",
    };

    if (code && errorMessages[code]) {
        return errorMessages[code];
    }

    return message || "ไม่สามารถดึงข้อมูล EasySlip ได้";
}

export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.SETTINGS_VIEW);
    if (!authCheck.success) {
        return NextResponse.json(
            { success: false, message: authCheck.error },
            { status: 401 },
        );
    }

    const apiKey = process.env.EASYSLIP_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "MISSING_API_KEY",
                    message: "ยังไม่ได้ตั้งค่า EASYSLIP_API_KEY",
                },
            },
            { status: 500 },
        );
    }

    try {
        const response = await fetch("https://api.easyslip.com/v2/info", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            cache: "no-store",
        });

        const result = await response.json() as InfoResponse | ErrorResponse;

        if (!response.ok || !("success" in result) || result.success === false) {
            const error = "error" in result ? result.error : undefined;

            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: error?.code || "EASYSLIP_INFO_FAILED",
                        message: mapEasySlipInfoError(error?.code, error?.message),
                    },
                },
                { status: response.status || 500 },
            );
        }

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        console.error("[ADMIN_EASYSLIP_INFO]", error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "EASYSLIP_INFO_FAILED",
                    message: "ไม่สามารถเชื่อมต่อ EasySlip ได้",
                },
            },
            { status: 500 },
        );
    }
}
