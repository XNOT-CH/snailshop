import { z } from "zod";
import { partialUpdateSchema } from "@/lib/validations/partialUpdate";

// Column limits come straight from the ProductCheckbox table so a too-long
// value is rejected with a Thai message instead of a raw MySQL truncation error.
export const createProductCheckboxSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, "กรุณากรอกหัวข้อช่องติ๊ก")
        .max(255, "หัวข้อต้องไม่เกิน 255 ตัวอักษร"),
    description: z
        .string()
        .trim()
        .max(1000, "รายละเอียดต้องไม่เกิน 1,000 ตัวอักษร")
        .optional()
        .nullable(),
    isRequired: z.boolean().optional(),
});

export const updateProductCheckboxSchema = partialUpdateSchema(createProductCheckboxSchema);

export type CreateProductCheckboxInput = z.infer<typeof createProductCheckboxSchema>;
export type UpdateProductCheckboxInput = z.infer<typeof updateProductCheckboxSchema>;
