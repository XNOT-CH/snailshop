import { z } from "zod";
import { partialUpdateSchema } from "@/lib/validations/partialUpdate";
import { STOCK_SEPARATOR_VALUES } from "@/lib/stock";

// No .default() here: the stock route needs `undefined` to stay undefined so it
// can fall back to the separator already stored on the product. Callers that
// want a default apply it themselves.
export const stockSeparatorSchema = z.enum(STOCK_SEPARATOR_VALUES);

// ── Create Product ───────────────────────────────────────
export const createProductSchema = z.object({
    name: z.string().min(1, "กรุณากรอกชื่อสินค้า").max(200),
    category: z.string().min(1, "กรุณาเลือกหมวดหมู่").max(100),
    price: z.coerce.number().min(0, "ราคาต้องไม่ต่ำกว่า 0"),
    discountPrice: z.coerce.number().min(0).optional().nullable(),
    currency: z.enum(["THB", "POINT"]).default("THB"),
    imageUrl: z.url({ error: "URL รูปภาพไม่ถูกต้อง" }).optional().or(z.literal("")),
    description: z.string().max(2000).optional().or(z.literal("")),
    secretData: z.string().optional().or(z.literal("")),
    // Derived from SEPARATOR_OPTIONS so the schema cannot drift from what
    // getDelimiter actually understands — an accepted value that is not in
    // that list silently means newline at purchase time.
    stockSeparator: stockSeparatorSchema.default("newline"),
    isFeatured: z.boolean().default(false),
    isSaleItem: z.boolean().default(false),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

// ── Update Product ───────────────────────────────────────
export const updateProductSchema = partialUpdateSchema(createProductSchema);
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
