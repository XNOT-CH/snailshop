import { z } from "zod";

export const promoCodeSchema = z.object({
    code: z
        .string()
        .min(3, "Code ต้องมีอย่างน้อย 3 ตัวอักษร")
        .max(50)
        .regex(/^[A-Z0-9_-]+$/, "Code ใช้ได้เฉพาะ A-Z, 0-9, -, _"),
    discountType: z.enum(["PERCENTAGE", "FIXED"], {
        error: "ประเภทต้องเป็น PERCENTAGE หรือ FIXED",
    }),
    discountValue: z.coerce
        .number()
        .min(0.01, "ส่วนลดต้องมากกว่า 0"),
    minOrderAmount: z.coerce.number().min(0).default(0),
    maxUses: z.coerce.number().int().min(0).default(0), // 0 = ไม่จำกัด
    expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
    isActive: z.boolean().default(true),
}).refine(
    (d) => d.discountType !== "PERCENTAGE" || d.discountValue <= 100,
    { message: "ส่วนลดเปอร์เซ็นต์ต้องไม่เกิน 100%", path: ["discountValue"] }
);
export type PromoCodeInput = z.infer<typeof promoCodeSchema>;
