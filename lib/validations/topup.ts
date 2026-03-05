import { z } from "zod";

// ── Create Topup Request ─────────────────────────────────
export const createTopupSchema = z.object({
    amount: z.coerce
        .number()
        .min(1, "จำนวนเงินต้องมากกว่า 0")
        .max(1_000_000, "จำนวนเงินเกินขีดจำกัด"),
    proofImage: z.string().url("กรุณาอัปโหลดสลิป").optional().or(z.literal("")),
    senderBank: z.string().max(50).optional().or(z.literal("")),
    transactionRef: z.string().max(100).optional().or(z.literal("")),
});
export type CreateTopupInput = z.infer<typeof createTopupSchema>;

// ── Review Topup Slip (Admin) ────────────────────────────
export const reviewTopupSchema = z.object({
    status: z.enum(["APPROVED", "REJECTED"], {
        error: "สถานะต้องเป็น APPROVED หรือ REJECTED",
    }),
    rejectReason: z.string().max(500).optional().or(z.literal("")),
}).refine(
    (d) => d.status !== "REJECTED" || (d.rejectReason && d.rejectReason.length > 0),
    { message: "กรุณาระบุสาเหตุการปฏิเสธ", path: ["rejectReason"] }
);
export type ReviewTopupInput = z.infer<typeof reviewTopupSchema>;
