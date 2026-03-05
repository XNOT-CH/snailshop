import { z } from "zod";

// ── Update User Role (Admin) ─────────────────────────────
export const updateUserRoleSchema = z.object({
    role: z.enum(["ADMIN", "USER", "MODERATOR"], {
        error: "Role ต้องเป็น ADMIN, USER หรือ MODERATOR",
    }),
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

// ── Adjust Credit/Point Balance (Admin) ──────────────────
export const adjustBalanceSchema = z.object({
    type: z.enum(["credit", "point"], {
        error: "ประเภทต้องเป็น credit หรือ point",
    }),
    amount: z.coerce.number()
        .min(-1_000_000, "จำนวนต้องไม่ต่ำกว่า -1,000,000")
        .max(1_000_000, "จำนวนต้องไม่เกิน 1,000,000"),
    note: z.string().max(200).optional().or(z.literal("")),
});
export type AdjustBalanceInput = z.infer<typeof adjustBalanceSchema>;
