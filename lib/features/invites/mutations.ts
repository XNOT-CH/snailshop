import { eq, sql } from "drizzle-orm";
import { db, inviteCodes } from "@/lib/db";
import type { CreateInviteCodeInput, UpdateInviteCodeInput } from "@/lib/validations/inviteCode";
import { findInviteCodeById } from "./queries";

export async function createInviteCode(input: CreateInviteCodeInput) {
    const id = crypto.randomUUID();
    await db.insert(inviteCodes).values({
        id,
        code: input.code,
        label: input.label,
        note: input.note ?? null,
        destination: input.destination,
    });
    return findInviteCodeById(id);
}

// Stops the link — isActive is what /r/<code> checks — and stamps deletedAt so
// the admin table files the row under "ปิดแล้ว" instead of listing it as live.
// The signups attributed to it are untouched: there is no hard delete, because
// User.inviteCodeId is the attribution record and is ON DELETE RESTRICT.
export async function softDeleteInviteCode(id: string) {
    await db
        .update(inviteCodes)
        .set({ deletedAt: sql`now()`, isActive: false })
        .where(eq(inviteCodes.id, id));
}

// `code` is not updatable — see lib/validations/inviteCode.ts.
export async function updateInviteCode(id: string, input: UpdateInviteCodeInput) {
    const values: Record<string, unknown> = {};
    if (input.label !== undefined) values.label = input.label;
    if (input.note !== undefined) values.note = input.note ?? null;
    if (input.destination !== undefined) values.destination = input.destination;

    if (Object.keys(values).length > 0) {
        await db.update(inviteCodes).set(values).where(eq(inviteCodes.id, id));
    }

    return findInviteCodeById(id);
}
