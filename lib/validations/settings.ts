import { z } from "zod";

export const siteSettingsSchema = z.object({
    siteName: z.string().min(1, "กรุณากรอกชื่อเว็บไซต์").max(200),
    siteDescription: z.string().max(500).optional().or(z.literal("")),
    logoUrl: z.string().url().optional().or(z.literal("")),
    faviconUrl: z.string().url().optional().or(z.literal("")),
    // Banner
    bannerImage1: z.string().url().optional().or(z.literal("")),
    bannerTitle1: z.string().max(200).optional().or(z.literal("")),
    bannerSubtitle1: z.string().max(300).optional().or(z.literal("")),
    bannerImage2: z.string().url().optional().or(z.literal("")),
    bannerTitle2: z.string().max(200).optional().or(z.literal("")),
    bannerSubtitle2: z.string().max(300).optional().or(z.literal("")),
    bannerImage3: z.string().url().optional().or(z.literal("")),
    bannerTitle3: z.string().max(200).optional().or(z.literal("")),
    bannerSubtitle3: z.string().max(300).optional().or(z.literal("")),
    // Social
    lineUrl: z.string().url().optional().or(z.literal("")),
    facebookUrl: z.string().url().optional().or(z.literal("")),
    discordUrl: z.string().url().optional().or(z.literal("")),
    // Features
    maintenanceMode: z.boolean().default(false),
    allowRegistration: z.boolean().default(true),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
