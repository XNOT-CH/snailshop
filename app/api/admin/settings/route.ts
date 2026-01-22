import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

// GET - Fetch site settings (public - for favicon and logo)
export async function GET() {
    try {
        let settings = await db.siteSettings.findFirst();

        // Create default settings if not exists
        if (!settings) {
            try {
                settings = await db.siteSettings.create({
                    data: {
                        heroTitle: "GameStore",
                        heroDescription: "Game ID Marketplace",
                        bannerImage1: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=2000&h=500&fit=crop",
                        bannerTitle1: "Game ID Marketplace",
                        bannerSubtitle1: "ซื้อขายไอดีเกมปลอดภัย 100%",
                        bannerImage2: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=2000&h=500&fit=crop",
                        bannerTitle2: "ROV, Valorant, Genshin",
                        bannerSubtitle2: "ไอดีคุณภาพ ราคาถูก พร้อมเล่นทันที",
                        bannerImage3: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=2000&h=500&fit=crop",
                        bannerTitle3: "Instant Delivery 24/7",
                        bannerSubtitle3: "ระบบอัตโนมัติ ได้ของทันทีไม่ต้องรอ",
                    },
                });
            } catch (createError) {
                // If fields don't exist, create with minimal data
                settings = await db.siteSettings.create({
                    data: {
                        heroTitle: "GameStore",
                        heroDescription: "Game ID Marketplace",
                    },
                });
            }
        }

        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        console.error("Error fetching settings:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            {
                success: false,
                message: "เกิดข้อผิดพลาด: กรุณารัน 'npx prisma db push' เพื่ออัปเดต database",
                error: errorMessage
            },
            { status: 500 }
        );
    }
}

// PUT - Update site settings (ADMIN ONLY)
export async function PUT(request: Request) {
    // Check if user is admin
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json(
            { success: false, message: authCheck.error },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();

        let settings = await db.siteSettings.findFirst();

        // Build update data dynamically based on what fields exist
        const updateData: Record<string, unknown> = {
            heroTitle: body.heroTitle || "GameStore",
            heroDescription: body.heroDescription || "Game ID Marketplace",
        };

        // Only add optional fields if they have values
        if (body.announcement !== undefined) updateData.announcement = body.announcement;
        if (body.bannerImage1 !== undefined) updateData.bannerImage1 = body.bannerImage1;
        if (body.bannerTitle1 !== undefined) updateData.bannerTitle1 = body.bannerTitle1;
        if (body.bannerSubtitle1 !== undefined) updateData.bannerSubtitle1 = body.bannerSubtitle1;
        if (body.bannerImage2 !== undefined) updateData.bannerImage2 = body.bannerImage2;
        if (body.bannerTitle2 !== undefined) updateData.bannerTitle2 = body.bannerTitle2;
        if (body.bannerSubtitle2 !== undefined) updateData.bannerSubtitle2 = body.bannerSubtitle2;
        if (body.bannerImage3 !== undefined) updateData.bannerImage3 = body.bannerImage3;
        if (body.bannerTitle3 !== undefined) updateData.bannerTitle3 = body.bannerTitle3;
        if (body.bannerSubtitle3 !== undefined) updateData.bannerSubtitle3 = body.bannerSubtitle3;
        if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl;
        if (body.backgroundImage !== undefined) updateData.backgroundImage = body.backgroundImage;

        if (settings) {
            // Update existing
            settings = await db.siteSettings.update({
                where: { id: settings.id },
                data: updateData,
            });
        } else {
            // Create new
            settings = await db.siteSettings.create({
                data: updateData as {
                    heroTitle: string;
                    heroDescription: string;
                    announcement?: string | null;
                    bannerImage1?: string | null;
                    bannerTitle1?: string | null;
                    bannerSubtitle1?: string | null;
                    bannerImage2?: string | null;
                    bannerTitle2?: string | null;
                    bannerSubtitle2?: string | null;
                    bannerImage3?: string | null;
                    bannerTitle3?: string | null;
                    bannerSubtitle3?: string | null;
                    logoUrl?: string | null;
                    backgroundImage?: string | null;
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: "บันทึกการตั้งค่าสำเร็จ",
            data: settings
        });
    } catch (error) {
        console.error("Error updating settings:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Check if it's a Prisma field error
        if (errorMessage.includes("Unknown argument") || errorMessage.includes("Unknown field")) {
            return NextResponse.json(
                {
                    success: false,
                    message: "กรุณารัน 'npx prisma db push' เพื่ออัปเดต database fields ใหม่"
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { success: false, message: `เกิดข้อผิดพลาด: ${errorMessage}` },
            { status: 500 }
        );
    }
}
