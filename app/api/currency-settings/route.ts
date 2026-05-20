import { NextResponse } from "next/server";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { contentApiError } from "@/lib/features/content/apiResponse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getCurrencySettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch public currency settings:", error);
    return contentApiError("Failed to fetch currency settings", { status: 500 });
  }
}
