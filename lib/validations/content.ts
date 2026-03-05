import { z } from "zod";

// ── Nav Item ──────────────────────────────────────────────
export const navItemSchema = z.object({
    label: z.string().min(1, "กรุณากรอกชื่อเมนู").max(100),
    href: z.string().min(1, "กรุณากรอก URL").max(500),
    icon: z.string().max(100).optional().or(z.literal("")),
    isActive: z.boolean().default(true),
    sortOrder: z.coerce.number().int().min(0).default(0),
});
export type NavItemInput = z.infer<typeof navItemSchema>;

// ── Currency Settings ─────────────────────────────────────
export const currencySettingsSchema = z.object({
    name: z.string().min(1, "กรุณากรอกชื่อสกุลเงิน").max(100),
    symbol: z.string().min(1, "กรุณากรอก Symbol").max(10),
    description: z.string().max(300).optional().or(z.literal("")),
    isActive: z.boolean().default(true),
});
export type CurrencySettingsInput = z.infer<typeof currencySettingsSchema>;

// ── News Item ─────────────────────────────────────────────
export const newsItemSchema = z.object({
    title: z.string().min(1, "กรุณากรอกหัวข้อข่าว").max(300),
    description: z.string().min(1, "กรุณากรอกรายละเอียด").max(5000),
    imageUrl: z.string().url().optional().or(z.literal("")),
    link: z.string().url().optional().or(z.literal("")),
    sortOrder: z.coerce.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
});
export type NewsItemInput = z.infer<typeof newsItemSchema>;

// ── Popup ─────────────────────────────────────────────────
export const popupSchema = z.object({
    title: z.string().max(200).optional().or(z.literal("")),
    imageUrl: z.string().url("กรุณากรอก URL รูปภาพที่ถูกต้อง"),
    linkUrl: z.string().url().optional().or(z.literal("")),
    sortOrder: z.coerce.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
    dismissOption: z
        .enum(["show_always", "session", "once"])
        .default("show_always"),
});
export type PopupInput = z.infer<typeof popupSchema>;

// ── Footer Link ───────────────────────────────────────────
export const footerLinkSchema = z.object({
    label: z.string().min(1, "กรุณากรอกชื่อลิงก์").max(100),
    href: z.string().min(1, "กรุณากรอก URL").max(500),
    openInNewTab: z.boolean().default(false),
});
export type FooterLinkInput = z.infer<typeof footerLinkSchema>;

// ── Help Item ─────────────────────────────────────────────
export const helpItemSchema = z.object({
    title: z.string().min(1, "กรุณากรอกหัวข้อ").max(300),
    content: z.string().min(1, "กรุณากรอกเนื้อหา").max(10000),
    category: z.string().max(100).optional().or(z.literal("")),
    sortOrder: z.coerce.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
});
export type HelpItemInput = z.infer<typeof helpItemSchema>;

// ── Role ──────────────────────────────────────────────────
export const roleSchema = z.object({
    name: z.string().min(1, "กรุณากรอกชื่อ Role").max(100),
    description: z.string().max(500).optional().or(z.literal("")),
    permissions: z.array(z.string()).default([]),
});
export type RoleInput = z.infer<typeof roleSchema>;
