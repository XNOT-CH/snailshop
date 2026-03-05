import { z } from "zod";

// ── Login ────────────────────────────────────────────────
export const loginSchema = z.object({
    username: z
        .string()
        .min(1, "กรุณากรอก Username หรืออีเมล")
        .max(100),
    password: z
        .string()
        .min(1, "กรุณากรอกรหัสผ่าน")
        .max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ── Register ─────────────────────────────────────────────
export const registerSchema = z.object({
    username: z
        .string()
        .min(3, "Username ต้องมีอย่างน้อย 3 ตัวอักษร")
        .max(50, "Username ต้องไม่เกิน 50 ตัวอักษร")
        .regex(/^[a-zA-Z0-9_]+$/, "Username ใช้ได้เฉพาะ a-z, 0-9, _"),
    email: z
        .string()
        .email("กรุณากรอกอีเมลให้ถูกต้อง")
        .max(200)
        .optional()
        .or(z.literal("")),
    password: z
        .string()
        .min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
        .max(200),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
}).refine((d) => d.password === d.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
});
export type RegisterInput = z.infer<typeof registerSchema>;
