import { NextResponse } from "next/server";
import { getCurrencySettings } from "@/lib/getCurrencySettings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getCurrencySettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch public currency settings:", error);
    return NextResponse.json({ error: "Failed to fetch currency settings" }, { status: 500 });
  }
}
