import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CACHE_TTL, cacheOrFetch } from "@/lib/cache";
import { findActiveInviteByCode } from "@/lib/features/invites/queries";
import {
    INVITE_COOKIE,
    INVITE_COOKIE_MAX_AGE_SECONDS,
    INVITE_COOKIE_PATH,
} from "@/lib/features/invites/inviteCookie";
import { INVITE_CODE_PATTERN } from "@/lib/validations/inviteCode";

export const dynamic = "force-dynamic";

// The shopper-facing side of an invite link. A promoter posts /r/THEIRCODE; this
// remembers which link brought the visitor and gets out of the way.
//
// An unknown, misspelled or switched-off code still lands the visitor in the
// shop rather than on a 404 — the link is printed in someone else's post and
// cannot be fixed after the fact, so it must never turn a real shopper away.
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> },
) {
    const { code: rawCode } = await params;
    const code = rawCode.trim().toUpperCase();

    const invite = INVITE_CODE_PATTERN.test(code)
        ? await cacheOrFetch(
              `invite_code:${code}`,
              async () => {
                  const row = await findActiveInviteByCode(code);
                  return row ? { id: row.id, destination: row.destination } : null;
              },
              CACHE_TTL.SHORT,
          )
        : null;

    const response = NextResponse.redirect(
        new URL(invite?.destination ?? "/", request.nextUrl.origin),
        // 307, never a permanent redirect: browsers and CDNs cache those, and a
        // cached invite link would skip this handler entirely — no cookie for
        // the visitor, so nothing tied back to the promoter.
        307,
    );
    response.headers.set("Cache-Control", "no-store");

    if (!invite) {
        return response;
    }

    response.cookies.set({
        name: INVITE_COOKIE,
        value: code,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: INVITE_COOKIE_PATH,
        maxAge: INVITE_COOKIE_MAX_AGE_SECONDS,
    });

    return response;
}
