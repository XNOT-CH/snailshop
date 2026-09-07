import type { NextRequest } from "next/server";
import { INVITE_COOKIE } from "./inviteCookie";
import { findActiveInviteByCode } from "./queries";
import { INVITE_CODE_PATTERN } from "@/lib/validations/inviteCode";

/**
 * resolveInviteCodeIdFromRequest — which invite link this signup belongs to.
 *
 * Returns null for anything unusual: no cookie, a forged value, a code that has
 * since been switched off, or a database that is momentarily unhappy. The whole
 * body is guarded because **registration must never fail over attribution** —
 * losing one row of marketing data is nothing next to a shopper who cannot
 * create an account.
 *
 * A code switched off between the click and the signup resolves to null on
 * purpose: "inactive" is the owner saying stop counting this channel.
 */
export async function resolveInviteCodeIdFromRequest(
    request: NextRequest,
): Promise<string | null> {
    try {
        const raw = request.cookies.get(INVITE_COOKIE)?.value;
        if (!raw) return null;

        const code = raw.trim().toUpperCase();
        // Junk never reaches the database.
        if (!INVITE_CODE_PATTERN.test(code)) return null;

        const invite = await findActiveInviteByCode(code);
        return invite?.id ?? null;
    } catch (error) {
        console.error("[INVITE_ATTRIBUTION]", error);
        return null;
    }
}
