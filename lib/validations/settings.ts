import { z } from "zod";

// Accepts full URLs (http/https) OR local paths starting with / (e.g. /uploads/...)
const imageUrl = z
    .string()
    .optional()
    .refine(
        (val) => {
            if (!val || val.trim() === "") return true;
            if (val.startsWith("/")) return true;
            try {
                const url = new URL(val);
                return url.protocol === "http:" || url.protocol === "https:";
            } catch {
                return false;
            }
        },
        { message: "กรุณาใส่ URL ที่ถูกต้อง หรือ path รูปที่อัปโหลด" }
    );

export const siteSettingsSchema = z.object({
    // General text
    siteName: z.string().min(1, "กรุณากรอกชื่อเว็บไซต์").max(200).optional(),
    siteDescription: z.string().max(500).optional().or(z.literal("")),
    heroTitle: z.string().max(200).optional().or(z.literal("")),
    heroDescription: z.string().max(500).optional().or(z.literal("")),
    announcement: z.string().max(1000).optional().or(z.literal("")),
    // Images
    logoUrl: imageUrl,
    faviconUrl: imageUrl,
    backgroundImage: imageUrl,
    backgroundBlur: z.boolean().default(true),
    // Banner
    bannerImage1: imageUrl,
    bannerTitle1: z.string().max(200).optional().or(z.literal("")),
    bannerSubtitle1: z.string().max(300).optional().or(z.literal("")),
    bannerImage2: imageUrl,
    bannerTitle2: z.string().max(200).optional().or(z.literal("")),
    bannerSubtitle2: z.string().max(300).optional().or(z.literal("")),
    bannerImage3: imageUrl,
    bannerTitle3: z.string().max(200).optional().or(z.literal("")),
    bannerSubtitle3: z.string().max(300).optional().or(z.literal("")),
    bannersJson: z.string().optional().or(z.literal("")),
    // Social
    lineUrl: z.url({ error: "URL ไม่ถูกต้อง" }).optional().or(z.literal("")),
    facebookUrl: z.url({ error: "URL ไม่ถูกต้อง" }).optional().or(z.literal("")),
    discordUrl: z.url({ error: "URL ไม่ถูกต้อง" }).optional().or(z.literal("")),
    // Features
    maintenanceMode: z.boolean().default(false),
    allowRegistration: z.boolean().default(true),
    showAllProducts: z.boolean().default(true),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
