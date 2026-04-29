import { z } from "zod";

// ── Login ────────────────────────────────────────────────
export const loginSchema = z.object({
    username: z
        .string()
        .trim()
        .min(1, "กรุณากรอก Username หรืออีเมล")
        .max(100),
    password: z
        .string()
        .min(1, "กรุณากรอกรหัสผ่าน")
        .max(200),
    turnstileToken: z
        .string()
        .min(1, "กรุณายืนยันว่าไม่ใช่บอท")
        .optional()
        .nullable(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
    identifier: z
        .string()
        .min(1, "กรุณากรอกชื่อผู้ใช้หรืออีเมล")
        .max(200),
    turnstileToken: z
        .string()
        .min(1, "กรุณายืนยันว่าไม่ใช่บอท")
        .optional()
        .nullable(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
    token: z
        .string()
        .min(1, "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง"),
    password: z
        .string()
        .min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
        .max(200),
    confirmPassword: z
        .string()
        .min(1, "กรุณายืนยันรหัสผ่าน"),
}).refine((d) => d.password === d.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ── Register ─────────────────────────────────────────────
export const registerSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, "Username ต้องมีอย่างน้อย 3 ตัวอักษร")
        .max(50, "Username ต้องไม่เกิน 50 ตัวอักษร")
        .regex(/^\w+$/, "Username ใช้ได้เฉพาะ a-z, 0-9, _"),
    email: z
        .string()
        .trim()
        .min(1, "กรุณากรอกอีเมล")
        .max(200)
        .email("กรุณากรอกอีเมลให้ถูกต้อง")
        .transform((value) => value.toLowerCase()),
    password: z
        .string()
        .min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
        .max(200),
    pin: z
        .string()
        .trim()
        .regex(/^\d{6}$/, "PIN ต้องเป็นตัวเลข 6 หลัก")
        .optional()
        .or(z.literal("")),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
    turnstileToken: z
        .string()
        .min(1, "กรุณายืนยันว่าไม่ใช่บอท")
        .optional()
        .nullable(),
}).refine((d) => d.password === d.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
});
export type RegisterInput = z.infer<typeof registerSchema>;
