import { mysqlNow } from "@/lib/utils/date";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { db, auditLogs } from "@/lib/db";
import { AUDIT_ACTIONS } from "@/lib/auditLog";
import { authenticateLoginAttempt } from "@/lib/login";


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

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
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
                    throw new Error(result.message);
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
