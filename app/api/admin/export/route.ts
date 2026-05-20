import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { formatDateInTimeZone } from "@/lib/utils/date";
import { PERMISSIONS } from "@/lib/permissions";
import {
    EXPORT_ROW_LIMIT,
    getAdminExportPayload,
    getDateRangeError,
    getUnknownExportTableMessage,
    isAdminExportTable,
} from "@/lib/features/admin/exportData";

function csvResponse(csv: string, filename: string) {
    return new NextResponse(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "X-Export-Row-Limit": String(EXPORT_ROW_LIMIT),
        },
    });
}

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.EXPORT_DATA);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table") ?? "orders";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const dateRangeError = getDateRangeError(from, to);

    if (dateRangeError) {
        return NextResponse.json({ success: false, message: dateRangeError }, { status: 400 });
    }

    const dateTag = formatDateInTimeZone(new Date());

    try {
        if (!isAdminExportTable(table)) {
            return NextResponse.json(
                { success: false, message: getUnknownExportTableMessage(table) },
                { status: 400 }
            );
        }

        const { csv, filename } = await getAdminExportPayload({ table, from, to, dateTag });
        return csvResponse(csv, filename);
    } catch (error: unknown) {
        console.error("CSV export error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Export failed" },
            { status: 500 }
        );
    }
}
