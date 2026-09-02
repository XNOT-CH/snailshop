import { z } from "zod";
import { normalizePermissionSelection } from "@/lib/permissions";
import {
  NEWS_DESCRIPTION_MAX_LENGTH,
  NEWS_TITLE_MAX_LENGTH,
  normalizeNewsTextInput,
} from "@/lib/newsValidation";
import { extractYouTubeVideoId } from "@/lib/helpVideos";
import {
  SAFE_PUBLIC_URL_ERROR,
  isSafePublicUrl,
  normalizeSafeUrlInput,
} from "@/lib/sanitize";

const safeRequiredUrl = z
  .string()
  .min(1, "กรุณากรอก URL")
  .max(500)
  .transform((value) => normalizeSafeUrlInput(value))
  .refine((value) => isSafePublicUrl(value), {
    message: SAFE_PUBLIC_URL_ERROR,
  });

const safeOptionalUrl = z
  .string()
  .max(500)
  .optional()
  .transform((value) => (typeof value === "string" ? normalizeSafeUrlInput(value) : value))
  .refine((value) => !value || isSafePublicUrl(value), {
    message: SAFE_PUBLIC_URL_ERROR,
  });

// Nav item
export const navItemSchema = z.object({
  label: z.string().min(1, "กรุณากรอกชื่อเมนู").max(100),
  href: safeRequiredUrl,
  icon: z.string().max(100).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});
export type NavItemInput = z.infer<typeof navItemSchema>;

export const navItemsReorderSchema = z.object({
  orders: z
    .array(
      z.object({
        id: z.string().min(1),
        sortOrder: z.number().int().min(0),
      }),
    )
    .min(1, "ไม่มีรายการให้จัดลำดับ"),
});

// Currency settings
export const currencySettingsSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อสกุลเงิน").max(100),
  symbol: z.string().max(10).default(""),
  description: z.string().max(300).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});
export type CurrencySettingsInput = z.infer<typeof currencySettingsSchema>;

const requiredNewsText = (label: string, maxLength: number) =>
  z
    .string()
    .transform((value) => normalizeNewsTextInput(value))
    .refine((value) => value.length > 0, {
      message: `กรุณากรอก${label}`,
    })
    .refine((value) => value.length <= maxLength, {
      message: `${label}ต้องไม่เกิน ${maxLength} ตัวอักษร`,
    });

// News item
export const newsItemSchema = z.object({
  title: requiredNewsText("หัวข้อข่าว", NEWS_TITLE_MAX_LENGTH),
  description: requiredNewsText("รายละเอียด", NEWS_DESCRIPTION_MAX_LENGTH),
  imageUrl: safeOptionalUrl,
  link: safeOptionalUrl,
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type NewsItemInput = z.infer<typeof newsItemSchema>;

// Popup
export const popupSchema = z.object({
  title: z.string().max(200).optional().or(z.literal("")),
  imageUrl: safeRequiredUrl,
  linkUrl: safeOptionalUrl,
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  dismissOption: z
    .enum(["show_always", "hide_1_hour", "session", "once"])
    .default("show_always"),
});
export type PopupInput = z.infer<typeof popupSchema>;

// Footer link
export const footerLinkSchema = z.object({
  label: z.string().min(1, "กรุณากรอกชื่อลิงก์").max(100),
  href: safeRequiredUrl,
  column: z.enum(["services", "cards"]).default("services"),
  openInNewTab: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
});
export type FooterLinkInput = z.infer<typeof footerLinkSchema>;

// Updates must NOT reuse footerLinkSchema.partial(): zod keeps `.default()`
// through `.partial()`, so a reorder body of just { sortOrder } would come back
// carrying column "services", openInNewTab false and isActive true — silently
// moving a "บัตรเติมเกม" link into the other column and un-hiding it.
export const footerLinkUpdateSchema = z
  .object({
    label: z.string().min(1, "กรุณากรอกชื่อลิงก์").max(100),
    href: safeRequiredUrl,
    column: z.enum(["services", "cards"]),
    openInNewTab: z.boolean(),
    sortOrder: z.coerce.number().int().min(0),
    isActive: z.boolean(),
  })
  .partial();

// Help item
export const helpItemSchema = z.object({
  title: z.string().min(1, "กรุณากรอกหัวข้อ").max(300),
  content: z.string().min(1, "กรุณากรอกเนื้อหา").max(10000),
  category: z.string().max(100).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type HelpItemInput = z.infer<typeof helpItemSchema>;

export const helpVideoSchema = z.object({
  title: z.string().min(1, "กรุณากรอกชื่อคลิป").max(255),
  youtubeUrl: z
    .string()
    .min(1, "กรุณากรอกลิงก์ YouTube")
    .max(1000)
    .refine((value) => extractYouTubeVideoId(value) !== null, {
      message: "ลิงก์ YouTube ไม่ถูกต้อง",
    }),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type HelpVideoInput = z.infer<typeof helpVideoSchema>;

// Role
export const roleSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อ Role").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  permissions: z.array(z.string()).default([]),
}).transform((data) => ({
  ...data,
  permissions: normalizePermissionSelection(data.permissions),
}));
export type RoleInput = z.infer<typeof roleSchema>;
