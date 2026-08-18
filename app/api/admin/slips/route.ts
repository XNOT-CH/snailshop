import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getCreditCodeUsageSummary, listCreditCodeUsages } from "@/lib/features/promo/queries";

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.TOPUP_CODE_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const params = request.nextUrl.searchParams;
        const rawPage = Number.parseInt(params.get("page") || "1", 10) || 1;
        const rawPageSize = Number.parseInt(params.get("pageSize") || "20", 10) || 20;
        const search = params.get("search")?.trim() || "";
        const startDateParam = params.get("startDate");
        const endDateParam = params.get("endDate");

        const [usages, summary] = await Promise.all([
            listCreditCodeUsages({
                search,
                startDate: startDateParam ? new Date(startDateParam) : undefined,
                endDate: endDateParam ? new Date(endDateParam) : undefined,
                page: Math.max(1, rawPage),
                pageSize: Math.min(50, Math.max(1, rawPageSize)),
            }),
            getCreditCodeUsageSummary(),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                records: usages.rows.map((row) => ({
                    id: row.id,
                    code: row.code,
                    amount: Number(row.amount),
                    createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date(row.createdAt).toISOString(),
                    user: { username: row.username, email: row.email },
                })),
                pagination: usages.pagination,
                summary,
            },
        });
    } catch (error) {
        console.error("[ADMIN_TOPUP_CODE_USAGES]", error);
        return NextResponse.json({ success: false, message: "Failed to load topup code usages" }, { status: 500 });
    }
}
