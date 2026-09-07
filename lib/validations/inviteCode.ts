import { z } from "zod";
import { partialUpdateSchema } from "@/lib/validations/partialUpdate";

export const INVITE_CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;

// The link lands somewhere inside this site. Anything that could leave it — an
// absolute URL, a protocol-relative "//evil.com", a backslash Windows browsers
// normalise to a slash — is rejected, because an admin link is the one place a
// hijacked destination would look trustworthy to a shopper.
const destinationSchema = z
    .string()
    .trim()
    .max(255, "หน้าปลายทางต้องไม่เกิน 255 ตัวอักษร")
    .refine(
        (value) => value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"),
        "หน้าปลายทางต้องเป็นลิงก์ภายในเว็บ เช่น /shop",
    );

export const createInviteCodeSchema = z.object({
    // Uppercased before the pattern check so a lowercase code from the form is
    // accepted rather than rejected; /r/<code> uppercases on the way in too.
    code: z
        .string()
        .trim()
        .transform((value) => value.toUpperCase())
        .refine(
            (value) => INVITE_CODE_PATTERN.test(value),
            "โค้ดต้องเป็น A-Z 0-9 _ - ความยาว 3-32 ตัวอักษร",
        ),
    label: z
        .string()
        .trim()
        .min(1, "กรุณากรอกชื่อช่องทาง")
        .max(120, "ชื่อช่องทางต้องไม่เกิน 120 ตัวอักษร"),
    note: z
        .string()
        .trim()
        .max(500, "หมายเหตุต้องไม่เกิน 500 ตัวอักษร")
        .optional()
        .nullable(),
    destination: destinationSchema.default("/shop"),
    isActive: z.boolean().default(true),
});

// `code` is left out on purpose: the link is already printed on someone else's
// page by the time it can be edited, and signups point at this row by id.
export const updateInviteCodeSchema = partialUpdateSchema(
    createInviteCodeSchema.omit({ code: true }),
);

export type CreateInviteCodeInput = z.infer<typeof createInviteCodeSchema>;
export type UpdateInviteCodeInput = z.infer<typeof updateInviteCodeSchema>;
