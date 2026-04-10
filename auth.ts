import { mysqlNow } from "@/lib/utils/date";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { authConfig } from "@/auth.config";
import { db, users, auditLogs, roles } from "@/lib/db";
import { loginSchema } from "@/lib/validations";
import { getUserPermissions } from "@/lib/permissions";
import {
    checkLoginRateLimit,
    recordFailedLogin,
    clearLoginAttempts,
    getProgressiveDelay,
    sleep,
} from "@/lib/rateLimit";
import { AUDIT_ACTIONS } from "@/lib/auditLog";


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
                ipAddress: { label: "IP Address", type: "text" },
            },
            async authorize(credentials) {
                // Validate with Zod
                const parsed = loginSchema.safeParse({
                    username: credentials?.username,
                    password: credentials?.password,
                });
                if (!parsed.success) return null;

                const { username, password } = parsed.data;
                const ipAddress = (credentials?.ipAddress as string) ?? "unknown";
                const identifier = `${ipAddress}:${username}`;

                // Check rate limit
                const rateLimit = checkLoginRateLimit(identifier);
                if (rateLimit.blocked) {
                    throw new Error(rateLimit.message ?? "ถูก rate limit");
                }

                // Progressive delay
                const delay = getProgressiveDelay(identifier);
                if (delay > 0) await sleep(delay);

                // Find user
                const user = await db.query.users.findFirst({
                    where: eq(users.username, username),
                });

                if (!user) {
                    recordFailedLogin(identifier);
                    await logAudit({
                        action: AUDIT_ACTIONS.LOGIN_FAILED,
                        resourceName: username,
                        status: "FAILURE",
                        reason: "ไม่พบผู้ใช้",
                        ipAddress,
                    });
                    throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
                }

                // Verify password
                const isValidPassword = await bcrypt.compare(password, user.password);
                if (!isValidPassword) {
                    recordFailedLogin(identifier);
                    const remaining = checkLoginRateLimit(identifier);
                    await logAudit({
                        action: AUDIT_ACTIONS.LOGIN_FAILED,
                        userId: user.id,
                        resourceName: username,
                        status: "FAILURE",
                        reason: "รหัสผ่านไม่ถูกต้อง",
                        ipAddress,
                    });
                    const msg =
                        remaining.remainingAttempts > 0
                            ? `รหัสผ่านไม่ถูกต้อง (เหลืออีก ${remaining.remainingAttempts} ครั้ง)`
                            : "รหัสผ่านไม่ถูกต้อง";
                    throw new Error(msg);
                }

                // Success
                clearLoginAttempts(identifier);
                await logAudit({
                    action: AUDIT_ACTIONS.LOGIN,
                    userId: user.id,
                    resourceName: username,
                    status: "SUCCESS",
                    ipAddress,
                });

                const roleRecord = await db.query.roles.findFirst({
                    where: eq(roles.code, user.role),
                    columns: { permissions: true },
                });

                return {
                    id: user.id,
                    name: user.name ?? user.username,
                    email: user.email ?? "",
                    image: user.image ?? null,
                    // Custom fields
                    role: user.role,
                    username: user.username,
                    permissions: getUserPermissions(user.role, roleRecord?.permissions ?? null),
                };
            },
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
});
