import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { siteSettings } from "@/lib/db/schema";
import { siteSettingsSchema } from "@/lib/validations/settings";

describe("siteSettingsSchema", () => {
    // PUT /api/admin/settings writes the parsed body straight into
    // db.update(siteSettings).set(body), so a key with no column behind it is
    // either dead weight or a runtime error waiting for someone to send it.
    it("only declares fields that exist as SiteSettings columns", () => {
        const columns = new Set(Object.keys(getTableColumns(siteSettings)));
        const orphans = Object.keys(siteSettingsSchema.shape).filter((key) => !columns.has(key));

        expect(orphans).toEqual([]);
    });
});
