import { z } from "zod";

const optionalThaiPhoneSchema = z
    .string()
    .refine((value) => value === "" || /^\d{10}$/.test(value), {
        message: "เบอร์มือถือต้องเป็นตัวเลข 10 หลักเท่านั้น",
    });

const optionalThaiNameSchema = z
    .string()
    .refine((value) => value === "" || /^[ก-๙\s]+$/.test(value.trim()), {
        message: "กรอกได้เฉพาะภาษาไทยเท่านั้น",
    });

const optionalEnglishNameSchema = z
    .string()
    .refine((value) => value === "" || /^[A-Za-z\s.'-]+$/.test(value.trim()), {
        message: "กรอกได้เฉพาะภาษาอังกฤษเท่านั้น",
    });

const optionalThaiTaxIdSchema = z
    .string()
    .refine((value) => value === "" || /^\d{13}$/.test(value), {
        message: "เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก",
    });

export const addressSchema = z.object({
    fullName: z
        .string()
        .max(200)
        .transform((value) => value.trim())
        .pipe(optionalThaiNameSchema)
        .optional()
        .or(z.literal("")),
    phone: z
        .string()
        .transform((value) => value.trim())
        .pipe(optionalThaiPhoneSchema)
        .optional()
        .or(z.literal("")),
    address: z.string().max(500).optional().or(z.literal("")),
    province: z.string().max(100).optional().or(z.literal("")),
    district: z.string().max(100).optional().or(z.literal("")),
    subdistrict: z.string().max(100).optional().or(z.literal("")),
    postalCode: z.string().max(10).optional().or(z.literal("")),
});

export const addressProfileSchema = addressSchema.extend({
    id: z.string().optional(),
    label: z.string().trim().min(1, "กรุณาตั้งชื่อข้อมูลนี้").max(100, "ชื่อต้องไม่เกิน 100 ตัวอักษร"),
    kind: z.enum(["tax", "shipping", "both"]),
    taxId: z
        .string()
        .transform((value) => value.replace(/\D/g, ""))
        .pipe(optionalThaiTaxIdSchema)
        .optional()
        .or(z.literal("")),
    isDefaultTax: z.boolean().optional(),
    isDefaultShipping: z.boolean().optional(),
});

const profileImageValue = z
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
        { message: "กรุณาใส่ URL รูปโปรไฟล์ที่ถูกต้อง หรือ path รูปที่อัปโหลด" }
    );

export const updateProfileSchema = z.object({
    name: z
        .string()
        .max(100, "ชื่อต้องไม่เกิน 100 ตัวอักษร")
        .optional(),
    email: z
        .email({ error: "กรุณากรอกอีเมลให้ถูกต้อง" })
        .or(z.literal(""))
        .optional(),
    phone: z
        .string()
        .transform((value) => value.trim())
        .pipe(optionalThaiPhoneSchema)
        .optional()
        .or(z.literal("")),
    image: profileImageValue,
    firstName: z.string().max(100).transform((value) => value.trim()).pipe(optionalThaiNameSchema).optional().or(z.literal("")),
    lastName: z.string().max(100).transform((value) => value.trim()).pipe(optionalThaiNameSchema).optional().or(z.literal("")),
    firstNameEn: z.string().max(100).transform((value) => value.trim()).pipe(optionalEnglishNameSchema).optional().or(z.literal("")),
    lastNameEn: z.string().max(100).transform((value) => value.trim()).pipe(optionalEnglishNameSchema).optional().or(z.literal("")),
    taxAddress: addressSchema.optional(),
    shippingAddress: addressSchema.optional(),
    currentPassword: z
        .string()
        .optional(),
    password: z
        .string()
        .min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
        .or(z.literal(""))
        .optional(),
    confirmPassword: z
        .string()
        .optional(),
    pin: z
        .string()
        .regex(/^\d{6}$/, "PIN ต้องเป็นตัวเลข 6 หลัก")
        .optional()
        .or(z.literal("")),
}).refine((data) => {
    if (data.password && data.password.length > 0) {
        return data.password === data.confirmPassword;
    }
    return true;
}, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
}).refine((data) => {
    if (data.password && data.password.length > 0) {
        return !!data.currentPassword && data.currentPassword.length > 0;
    }
    return true;
}, {
    message: "กรุณากรอกรหัสผ่านปัจจุบัน",
    path: ["currentPassword"],
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
