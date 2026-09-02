import { z } from "zod";

/**
 * partialUpdateSchema — the schema to validate a PATCH-style body against.
 *
 * `schema.partial()` is NOT that schema. Zod keeps `.default()` through
 * `.partial()`, so `navItemSchema.partial().parse({ isActive: false })` returns
 * `{ isActive: false, sortOrder: 0 }` — a field the client never sent arrives
 * looking exactly like one it did. Every route here writes any defined field to
 * the database, so those phantom values are written too: toggling a nav item's
 * visibility reset its sort order to 0, and reordering news un-hid hidden
 * articles.
 *
 * Stripping the defaults makes an absent field stay absent, which is what a
 * partial update means.
 */
export function partialUpdateSchema<Shape extends z.ZodRawShape>(
    schema: z.ZodObject<Shape>,
): z.ZodType<Partial<z.infer<z.ZodObject<Shape>>>> {
    const fields = Object.entries(schema.shape) as [string, z.ZodTypeAny][];
    const shape = Object.fromEntries(
        fields.map(([key, field]) => {
            const stripped =
                field.def.type === "default"
                    ? (field as z.ZodDefault<z.ZodTypeAny>).removeDefault()
                    : field;
            return [key, stripped.optional()];
        }),
    );
    return z.object(shape) as unknown as z.ZodType<Partial<z.infer<z.ZodObject<Shape>>>>;
}
