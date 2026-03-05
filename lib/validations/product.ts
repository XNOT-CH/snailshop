import { z } from "zod";

// ── Create Product ───────────────────────────────────────
export const createProductSchema = z.object({
    name: z.string().min(1, "กรุณากรอกชื่อสินค้า").max(200),
    category: z.string().min(1, "กรุณาเลือกหมวดหมู่").max(100),
    price: z.coerce.number().min(0, "ราคาต้องไม่ต่ำกว่า 0"),
    discountPrice: z.coerce.number().min(0).optional().nullable(),
    currency: z.enum(["THB", "POINT"]).default("THB"),
    imageUrl: z.string().url("กรุณากรอก URL รูปภาพที่ถูกต้อง").optional().or(z.literal("")),
    description: z.string().max(2000).optional().or(z.literal("")),
    secretData: z.string().optional().or(z.literal("")),
    stockSeparator: z.enum(["newline", "comma", "tab"]).default("newline"),
    isFeatured: z.boolean().default(false),
    isSaleItem: z.boolean().default(false),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

// ── Update Product ───────────────────────────────────────
export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
