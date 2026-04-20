import { z } from "zod";

const pinField = z
    .string()
    .regex(/^\d{6}$/, "PIN ต้องเป็นตัวเลข 6 หลัก");

export const updatePinSchema = z.object({
    currentPassword: z.string().optional(),
    currentPin: z.string().optional(),
    newPin: pinField,
    confirmPin: z.string().min(1, "กรุณายืนยัน PIN"),
    hasExistingPin: z.boolean(),
}).superRefine((data, ctx) => {
    if (data.newPin !== data.confirmPin) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "PIN ไม่ตรงกัน",
            path: ["confirmPin"],
        });
    }

    if (data.hasExistingPin) {
        if (!data.currentPin || !/^\d{6}$/.test(data.currentPin)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "กรุณากรอก PIN ปัจจุบัน 6 หลัก",
                path: ["currentPin"],
            });
        }
    } else if (!data.currentPassword || data.currentPassword.length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "กรุณากรอกรหัสผ่านปัจจุบัน",
            path: ["currentPassword"],
        });
    }
});

export const resetPinSchema = z.object({
    currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านปัจจุบัน"),
    newPin: pinField,
    confirmPin: z.string().min(1, "กรุณายืนยัน PIN"),
}).superRefine((data, ctx) => {
    if (data.newPin !== data.confirmPin) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "PIN ไม่ตรงกัน",
            path: ["confirmPin"],
        });
    }
});

export type UpdatePinInput = z.infer<typeof updatePinSchema>;
export type ResetPinInput = z.infer<typeof resetPinSchema>;
