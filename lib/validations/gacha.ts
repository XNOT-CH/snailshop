import { z } from "zod";

// ── Gacha Machine ────────────────────────────────────────
export const gachaMachineSchema = z.object({
    name: z.string().min(1, "กรุณากรอกชื่อตู้กาชา").max(200),
    description: z.string().max(1000).optional().or(z.literal("")),
    imageUrl: z.string().url().optional().or(z.literal("")),
    categoryId: z.string().uuid().optional().nullable(),
    gameType: z.enum(["SPIN_X", "GRID_3X3"]).default("SPIN_X"),
    costType: z.enum(["FREE", "CREDIT", "POINT"]).default("FREE"),
    costAmount: z.coerce.number().min(0).default(0),
    dailySpinLimit: z.coerce.number().int().min(0).default(0),
    tierMode: z.enum(["SINGLE", "MULTI"]).default("SINGLE"),
    isActive: z.boolean().default(false),
    isEnabled: z.boolean().default(true),
    sortOrder: z.coerce.number().int().min(0).default(0),
});
export type GachaMachineInput = z.infer<typeof gachaMachineSchema>;

// ── Gacha Reward ─────────────────────────────────────────
export const gachaRewardSchema = z.object({
    gachaMachineId: z.string().uuid().optional().nullable(),
    rewardType: z.enum(["PRODUCT", "CREDIT", "POINT"]),
    tier: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
    probability: z.coerce.number().min(0).max(100).default(1),
    productId: z.string().uuid().optional().nullable(),
    rewardName: z.string().max(200).optional().or(z.literal("")),
    rewardAmount: z.coerce.number().min(0).optional().nullable(),
    rewardImageUrl: z.string().url().optional().or(z.literal("")),
    isActive: z.boolean().default(true),
});
export type GachaRewardInput = z.infer<typeof gachaRewardSchema>;

// ── Gacha Settings ───────────────────────────────────────
export const gachaSettingsSchema = z.object({
    isEnabled: z.boolean().default(true),
    costType: z.enum(["FREE", "CREDIT", "POINT"]).default("FREE"),
    costAmount: z.coerce.number().min(0).default(0),
    dailySpinLimit: z.coerce.number().int().min(0).default(0),
    tierMode: z.enum(["PRICE", "MANUAL"]).default("PRICE"),
});
export type GachaSettingsInput = z.infer<typeof gachaSettingsSchema>;
