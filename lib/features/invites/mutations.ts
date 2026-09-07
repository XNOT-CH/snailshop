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
        isActive: input.isActive,
    });
    return findInviteCodeById(id);
}

// Hides the code from the admin table and kills the link, without touching the
// signups attributed to it. There is no hard delete: User.inviteCodeId is the
// attribution record and its foreign key is ON DELETE RESTRICT.
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
    if (input.isActive !== undefined) values.isActive = input.isActive;

    if (Object.keys(values).length > 0) {
        await db.update(inviteCodes).set(values).where(eq(inviteCodes.id, id));
    }

    return findInviteCodeById(id);
}
