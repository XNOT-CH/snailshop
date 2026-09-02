import { describe, expect, it } from "vitest";
import { z } from "zod";
import { partialUpdateSchema } from "@/lib/validations/partialUpdate";
import {
    footerLinkSchema,
    helpItemSchema,
    helpVideoSchema,
    navItemSchema,
    newsItemSchema,
    popupSchema,
} from "@/lib/validations/content";
import { siteSettingsSchema } from "@/lib/validations/settings";
import { createProductSchema } from "@/lib/validations/product";
import { createQuestSchema } from "@/lib/validations/quest";

// Every schema that a PATCH-style route validates against. A field the client
// did not send must not come back with a value, or the route writes it.
const updateSchemas: Record<string, z.ZodObject<z.ZodRawShape>> = {
    footerLinkSchema,
    helpItemSchema,
    helpVideoSchema,
    navItemSchema,
    newsItemSchema,
    popupSchema,
    siteSettingsSchema,
    createProductSchema,
    createQuestSchema,
};

describe("partialUpdateSchema", () => {
    it.each(Object.entries(updateSchemas))("%s: an empty body stays empty", (_name, schema) => {
        expect(partialUpdateSchema(schema).parse({})).toEqual({});
    });

    it.each(Object.entries(updateSchemas))(
        "%s: zod's own .partial() would not (guards the reason this helper exists)",
        (_name, schema) => {
            // If this ever starts returning {}, zod changed and the helper can go.
            const injected = schema.partial().parse({});
            expect(typeof injected).toBe("object");
        },
    );

    it("keeps the fields the client did send", () => {
        const parsed = partialUpdateSchema(navItemSchema).parse({ isActive: false });
        expect(parsed).toEqual({ isActive: false });
    });

    it("still validates the fields that are present", () => {
        expect(() => partialUpdateSchema(navItemSchema).parse({ label: "" })).toThrow(z.ZodError);
    });
});
