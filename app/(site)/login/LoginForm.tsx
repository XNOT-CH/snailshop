"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showError } from "@/lib/swal";
import { normalizeCallbackUrl } from "@/lib/authRedirect";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthFormShell } from "@/components/auth/AuthFormShell";
import { TurnstileField } from "@/components/auth/TurnstileField";
import { Loader2, Eye, EyeOff, LogIn } from "lucide-react";

const E2E_TURNSTILE_BYPASS_TOKEN = "__e2e_turnstile_bypass__";

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
    invalid_payload: "กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน",
    turnstile_failed: "การยืนยันความปลอดภัยไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
    rate_limited: "ล็อกอินบ่อยเกินไป กรุณาลองใหม่ภายหลัง",
    invalid_credentials: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
    credentials: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
};

function getLoginErrorMessage(error?: string, code?: string) {
    if (code && LOGIN_ERROR_MESSAGES[code]) {
        return LOGIN_ERROR_MESSAGES[code];
    }

    if (error === "CredentialsSignin") {
        return LOGIN_ERROR_MESSAGES.credentials;
    }

    return error || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่";
}

function getSafeLoginRedirectUrl(value: string | null | undefined, fallback: string) {
    if (!value) {
        return fallback;
    }

    try {
        const url = new URL(value, globalThis.location.origin);
        return normalizeCallbackUrl(`${url.pathname}${url.search}${url.hash}`);
    } catch {
        return fallback;
    }
}

interface LoginFormProps {
    readonly logoUrl: string | null;
    readonly turnstileConfigError?: string | null;
}

export function LoginForm({ logoUrl, turnstileConfigError = null }: Readonly<LoginFormProps>) {
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [turnstileError, setTurnstileError] = useState<string | null>(null);
    const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
    const [formData, setFormData] = useState({ username: "", password: "" });
    const callbackUrl = normalizeCallbackUrl(searchParams.get("callbackUrl"));
    const e2eTurnstileToken =
        process.env.NEXT_PUBLIC_E2E_AUTH_TEST_MODE === "1" &&
            process.env.NODE_ENV !== "production"
            ? E2E_TURNSTILE_BYPASS_TOKEN
            : null;
    const hasTurnstile = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) && !e2eTurnstileToken;

    const handleTurnstileChange = useCallback((token: string | null) => {
        setTurnstileToken(token);
        if (token) {
            setTurnstileError(null);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (hasTurnstile && !turnstileToken) {
            setTurnstileError("กรุณายืนยันว่าไม่ใช่บอทก่อนเข้าสู่ระบบ");
            return;
        }

        setIsLoading(true);

        try {
            const result = await signIn("credentials", {
                username: formData.username,
                password: formData.password,
                turnstileToken: e2eTurnstileToken ?? turnstileToken,
                callbackUrl,
                redirect: false,
            });

            if (result?.error) {
                showError(getLoginErrorMessage(result.error, result.code));
            } else if (result?.url) {
                globalThis.location.href = getSafeLoginRedirectUrl(result.url, callbackUrl);
            } else {
                globalThis.location.href = callbackUrl;
            }
        } catch {
            showError("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
        } finally {
            if (hasTurnstile) {
                setTurnstileResetSignal((prev) => prev + 1);
            }
            setIsLoading(false);
        }
    };

    return (
        <AuthFormShell logoUrl={logoUrl} title="เข้าสู่ระบบ" subtitle="Login">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div className="space-y-2">
                            <label htmlFor="username" className="text-sm text-muted-foreground">ชื่อผู้ใช้งาน หรืออีเมล <span className="text-red-500" aria-hidden="true">*</span></label>
                            <Input
                                id="username"
                                placeholder="username หรืออีเมล"
                                autoComplete="username"
                                className="h-12 bg-muted/50 border-border rounded-xl transition-colors"
                                value={formData.username}
                                onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm text-muted-foreground">รหัสผ่าน <span className="text-red-500" aria-hidden="true">*</span></label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="h-12 bg-muted/50 border-border rounded-xl pr-12 transition-colors"
                                    value={formData.password}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                ลืมรหัสผ่าน
                            </Link>
                        </div>

                        <TurnstileField
                            enabled={hasTurnstile}
                            onTokenChange={handleTurnstileChange}
                            resetSignal={turnstileResetSignal}
                            error={turnstileError}
                        />

                        {turnstileConfigError ? (
                            <Alert variant="destructive" className="rounded-xl">
                                <AlertDescription>{turnstileConfigError}</AlertDescription>
                            </Alert>
                        ) : null}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-12 rounded-[4px] bg-[#1f8f55] text-white shadow-none hover:bg-[#187a49] font-semibold transition-colors"
                            disabled={isLoading || Boolean(turnstileConfigError)}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    กำลังเข้าสู่ระบบ...
                                </>
                            ) : (
                                <>
                                    <LogIn className="h-4 w-4" />
                                    เข้าสู่ระบบ
                                </>
                            )}
                        </Button>

                        {/* Register Link */}
                        <p className="text-center text-sm text-muted-foreground">
                            ถ้ายังไม่มีบัญชี{" "}
                            <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-primary hover:underline">
                                สมัครสมาชิกเลย!
                            </Link>
                        </p>
                    </form>
        </AuthFormShell>
    );
}
