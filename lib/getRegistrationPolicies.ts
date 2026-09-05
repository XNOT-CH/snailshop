import { cache } from "react";
import { db } from "@/lib/db";
import { cacheOrFetch, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import type { RegistrationPolicyType } from "@/lib/validations/content";

export interface PublicRegistrationPolicy {
    id: string;
    titleTh: string;
    titleEn: string | null;
    contentTh: string;
    contentEn: string | null;
}

export interface RegistrationPolicies {
    tos: PublicRegistrationPolicy[];
    pp: PublicRegistrationPolicy[];
}

const EMPTY: RegistrationPolicies = { tos: [], pp: [] };

// Same shape as getSiteSettings: React `cache()` dedupes within one request and
// the Redis layer caches across requests, because the signup page, /terms and
// /privacy all read this. Cleared by invalidateRegistrationPolicyCaches() in
// every mutating admin route, so edits show up immediately; the long TTL is
// only a backstop.
export const getRegistrationPolicies = cache(async (): Promise<RegistrationPolicies> => {
    return cacheOrFetch(
        CACHE_KEYS.REGISTRATION_POLICIES,
        async () => {
            try {
                const rows = await db.query.registrationPolicies.findMany({
                    columns: {
                        id: true,
                        type: true,
                        titleTh: true,
                        titleEn: true,
                        contentTh: true,
                        contentEn: true,
                    },
                    where: (t, { eq }) => eq(t.isActive, true),
                    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.createdAt)],
                });

                const grouped: RegistrationPolicies = { tos: [], pp: [] };
                for (const { type, ...policy } of rows) {
                    const bucket = type === "PP" ? grouped.pp : grouped.tos;
                    bucket.push(policy);
                }

                return grouped;
            } catch (error) {
                console.error("Error fetching registration policies:", error);
                return EMPTY;
            }
        },
        CACHE_TTL.LONG,
    );
});

export function hasRegistrationPolicies(policies: RegistrationPolicies): boolean {
    return policies.tos.length > 0 || policies.pp.length > 0;
}

export function policyBucket(
    policies: RegistrationPolicies,
    type: RegistrationPolicyType,
): PublicRegistrationPolicy[] {
    return type === "PP" ? policies.pp : policies.tos;
}
