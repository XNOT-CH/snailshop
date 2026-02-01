import { z } from "zod";

// Schema สำหรับอัปเดตโปรไฟล์
export const updateProfileSchema = z.object({
    name: z
        .string()
        .min(1, "กรุณากรอกชื่อ")
        .max(100, "ชื่อต้องไม่เกิน 100 ตัวอักษร"),
    email: z
        .string()
        .email("กรุณากรอกอีเมลให้ถูกต้อง")
        .or(z.literal("")), // อนุญาตให้ว่างได้
    image: z
        .string()
        .url("กรุณากรอก URL รูปภาพให้ถูกต้อง")
        .or(z.literal(""))
        .optional(), // Optional profile image URL
    password: z
        .string()
        .min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
        .or(z.literal("")) // อนุญาตให้ว่างได้ (ใช้รหัสเดิม)
        .optional(),
    confirmPassword: z
        .string()
        .optional(),
}).refine((data) => {
    // ถ้ากรอก password ต้องกรอก confirmPassword ให้ตรงกัน
    if (data.password && data.password.length > 0) {
        return data.password === data.confirmPassword;
    }
    return true;
}, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
