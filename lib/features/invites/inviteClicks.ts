import { sql } from "drizzle-orm";
import crypto from "node:crypto";
import { db, inviteClicksDaily } from "@/lib/db";
import { redis, isRedisAvailable } from "@/lib/redis";
import { getClientIp } from "@/lib/rateLimit";
import { formatDateInTimeZone } from "@/lib/utils/date";

// Link unfurlers open every URL that gets posted — one LINE share can produce a
// handful of hits before a human sees it. They are the realistic way an invite
// count gets inflated, more than anyone refreshing on purpose.
const NON_HUMAN_UA =
    /(bot|crawler|spider|facebookexternalhit|line|discord|slack|telegram|whatsapp|preview|curl|wget|headless|python-requests|axios)/i;

// Keys written through the raw client are not namespaced — only lib/cache.ts
// does that — and dev shares one Upstash database with production. Without this
// prefix a click while testing locally would mark a production visitor's IP as
// already counted for the rest of the day, and nothing would error.
const REDIS_NAMESPACE = process.env.NODE_ENV === "production" ? "prod" : "dev";

const DEDUPE_TTL_SECONDS = 60 * 60 * 36;

/**
 * recordInviteClick — count one visit to /r/<code>, once per visitor per day.
 *
 * Analytics only: every failure is swallowed, the same contract as
 * recordProductView. A shopper must reach the shop even if Redis, the database
 * or this whole function is having a bad day.
 */
export async function recordInviteClick(inviteCodeId: string, request: Request): Promise<void> {
    try {
        const userAgent = request.headers.get("user-agent") ?? "";
        if (!userAgent || NON_HUMAN_UA.test(userAgent)) {
            return;
        }

        const clickDate = formatDateInTimeZone(new Date());

        if (isRedisAvailable() && redis) {
            // The IP is hashed rather than stored: the count needs to know
            // "same visitor as before?", not who the visitor is.
            const visitor = crypto
                .createHash("sha256")
                .update(getClientIp(request))
                .digest("hex")
                .slice(0, 16);
            const key = `${REDIS_NAMESPACE}:invite:click:${inviteCodeId}:${clickDate}:${visitor}`;
            const seen = await redis.incr(key);
            if (seen === 1) {
                await redis.expire(key, DEDUPE_TTL_SECONDS);
            } else {
                return;
            }
        }
        // Redis unreachable: count the click anyway. An inflated number is a
        // worse metric; a missing one is no metric at all.

        await db
            .insert(inviteClicksDaily)
            .values({ inviteCodeId, clickDate, clicks: 1 })
            .onDuplicateKeyUpdate({
                set: { clicks: sql`${inviteClicksDaily.clicks} + 1` },
            });
    } catch (error) {
        console.error("[INVITE_CLICK_RECORD]", error);
    }
}
