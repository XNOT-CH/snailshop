import { z } from "zod";
import { partialUpdateSchema } from "@/lib/validations/partialUpdate";
import { QUEST_GOAL_TYPES } from "@/lib/features/quests/dailyQuests";

// Column limits come straight from the DailyQuest table so a too-long value is
// rejected with a Thai message instead of a raw MySQL truncation error.
export const createQuestSchema = z.object({
    slug: z
        .string()
        .trim()
        .min(1, "กรุณากรอกรหัสภารกิจ (slug)")
        .max(100, "รหัสภารกิจต้องไม่เกิน 100 ตัวอักษร")
        .regex(/^[a-z0-9-]+$/, "รหัสภารกิจใช้ได้เฉพาะ a-z, 0-9 และ -"),
    title: z.string().trim().min(1, "กรุณากรอกชื่อภารกิจ").max(255, "ชื่อภารกิจต้องไม่เกิน 255 ตัวอักษร"),
    description: z.string().trim().max(500, "คำอธิบายต้องไม่เกิน 500 ตัวอักษร").optional().nullable(),
    goalType: z.enum(QUEST_GOAL_TYPES, { error: "ประเภทเงื่อนไขไม่ถูกต้อง" }),
    goalValue: z.coerce
        .number()
        .int("เป้าหมายต้องเป็นจำนวนเต็ม")
        .min(1, "เป้าหมายต้องมากกว่า 0")
        .max(1_000_000, "เป้าหมายต้องไม่เกิน 1,000,000"),
    rewardPoints: z.coerce
        .number()
        .int("แต้มรางวัลต้องเป็นจำนวนเต็ม")
        .min(1, "แต้มรางวัลต้องมากกว่า 0")
        .max(1_000_000, "แต้มรางวัลต้องไม่เกิน 1,000,000"),
    // Kept relative so a quest can never point players off-site.
    ctaHref: z
        .string()
        .trim()
        .max(255, "ลิงก์ต้องไม่เกิน 255 ตัวอักษร")
        .regex(/^\/[^\s]*$/, "ลิงก์ต้องเป็นเส้นทางภายในเว็บ เช่น /shop")
        .optional()
        .nullable()
        .or(z.literal("")),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
    isActive: z.boolean().optional(),
});

export const updateQuestSchema = partialUpdateSchema(createQuestSchema);

export type CreateQuestInput = z.infer<typeof createQuestSchema>;
export type UpdateQuestInput = z.infer<typeof updateQuestSchema>;
