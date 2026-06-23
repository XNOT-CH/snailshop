import { mysqlNow } from "@/lib/utils/date";
import NextAuth, { CredentialsSignin } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { authConfig } from "@/auth.config";
import { db, auditLogs, roles, users } from "@/lib/db";
import { AUDIT_ACTIONS } from "@/lib/auditLog";
import { authenticateLoginAttempt } from "@/lib/login";
import { getUserPermissions } from "@/lib/permissions";

/**
 * How often the role/permissions baked into the JWT are re-synced from the DB.
 * Bounds how long a role change or revocation can lag behind in long-lived
 * (30-day) sessions. The edge middleware cannot touch the DB, so this node-side
 * refresh is the propagation path for stale-permission revocation.
 */
const PERMS_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

class LoginAttemptError extends CredentialsSignin {
    code: string;

    constructor(code: string) {
        super();
        this.code = code;
    }
}

const e2eAuthLogger =
    process.env.E2E_AUTH_TEST_MODE === "1"
        ? {
              error(error: Error) {
                  const authError = error as Error & { type?: string };
                  if (authError.type === "CredentialsSignin") return;

                  console.error(error);
              },
          }
        : undefined;

async function logAudit(params: {
    action: string;
    userId?: string;
    resourceName?: string;
    status: "SUCCESS" | "FAILURE";
    reason?: string;
    ipAddress?: string;
}) {
    try {
        await db.insert(auditLogs).values({
            action: params.action,
            userId: params.userId,
            resource: "User",
            resourceId: params.userId,
            details: JSON.stringify({ resourceName: params.resourceName, reason: params.reason }),
            ipAddress: params.ipAddress ?? "unknown",
            status: params.status,
            createdAt: mysqlNow(),
        });
    } catch {
        // Non-critical — don't fail login if audit log fails
    }
}

/**
 * Re-sync role/permissions from the DB at most once per refresh interval so that
 * role changes, demotions, and deletions take effect without waiting for the
 * 30-day token to expire. Runs only in the Node.js runtime (this file); the edge
 * middleware keeps the lightweight DB-free jwt callback from auth.config.ts.
 */
async function refreshTokenPermissions(token: JWT): Promise<JWT> {
    const lastRefresh = typeof token.permsRefreshedAt === "number" ? token.permsRefreshedAt : 0;
    if (Date.now() - lastRefresh < PERMS_REFRESH_INTERVAL_MS) {
        return token;
    }

    if (!token.id) return token;

    try {
        const fresh = await db.query.users.findFirst({
            where: eq(users.id, token.id),
            columns: { role: true, bannedAt: true },
        });

        if (!fresh || fresh.bannedAt) {
            // User no longer exists, or has been banned — strip privileged claims
            // so the still-valid session cookie can no longer authorize anything.
            token.role = "USER";
            token.permissions = [];
            token.permsRefreshedAt = Date.now();
            return token;
        }

        const roleRecord = await db.query.roles.findFirst({
            where: eq(roles.code, fresh.role),
            columns: { permissions: true },
        });

        token.role = fresh.role;
        token.permissions = getUserPermissions(fresh.role, roleRecord?.permissions ?? null);
        token.permsRefreshedAt = Date.now();
    } catch {
        // On a transient DB error keep existing claims rather than locking the
        // user out; the next request will retry the refresh.
    }

    return token;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    callbacks: {
        ...authConfig.callbacks,
        async jwt(params) {
            // Run the shared base callback first (persists claims on sign-in).
            const token = (await authConfig.callbacks!.jwt!(params)) as JWT;

            if (params.user) {
                // Fresh sign-in: claims are already authoritative, stamp the time.
                token.permsRefreshedAt = Date.now();
                return token;
            }

            return refreshTokenPermissions(token);
        },
    },
    logger: e2eAuthLogger,
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
                turnstileToken: { label: "Turnstile Token", type: "text" },
            },
            async authorize(credentials, request) {
                const result = await authenticateLoginAttempt({
                    payload: {
                        username: credentials?.username,
                        password: credentials?.password,
                        turnstileToken: credentials?.turnstileToken,
                    },
                    request,
                    onAudit: async (entry) => {
                        await logAudit({
                            action:
                                entry.action === "LOGIN"
                                    ? AUDIT_ACTIONS.LOGIN
                                    : AUDIT_ACTIONS.LOGIN_FAILED,
                            userId: entry.userId,
                            resourceName: entry.resourceName,
                            status: entry.status,
                            reason: entry.reason,
                            ipAddress: entry.ipAddress,
                        });
                    },
                });

                if (!result.success) {
                    throw new LoginAttemptError(result.code.toLowerCase());
                }

                return result.user;
            },
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
});
