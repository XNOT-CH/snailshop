import { NextResponse } from "next/server";
import { getMaintenanceState } from "@/lib/maintenanceMode";

export async function GET() {
    return NextResponse.json({
        success: true,
        data: {
            gacha: getMaintenanceState("gacha"),
            purchase: getMaintenanceState("purchase"),
            topup: getMaintenanceState("topup"),
        },
    });
}
