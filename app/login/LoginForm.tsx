"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showError } from "@/lib/swal";
import { normalizeCallbackUrl } from "@/lib/authRedirect";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, Gamepad2 } from "lucide-react";

interface LoginFormProps {
    readonly logoUrl: string | null;
}

export function LoginForm({ logoUrl }: Readonly<LoginFormProps>) {
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [turnstileError, setTurnstileError] = useState<string | null>(null);
    const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
    const [formData, setFormData] = useState({ username: "", password: "" });
    const callbackUrl = normalizeCallbackUrl(searchParams.get("callbackUrl"));
    const hasTurnstile = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

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
                turnstileToken,
                callbackUrl,
                redirect: false,
            });

            if (result?.error) {
                showError(result.error);
            } else if (result?.url) {
                globalThis.location.href = result.url;
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
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="bg-card rounded-2xl shadow-xl shadow-primary/10 p-8">
                    {/* Header with Logo */}
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-primary">เข้าสู่ระบบ</h1>
                            <p className="text-muted-foreground text-sm">Login</p>
                        </div>
                        {logoUrl ? (
                            <Image
                                src={logoUrl}
                                alt="Logo"
                                width={64}
                                height={64}
                                className="h-16 w-16 rounded-xl object-contain"
                                priority
                            />
                        ) : (
                            <div className="h-16 w-16 rounded-xl bg-primary flex items-center justify-center">
                                <Gamepad2 className="h-8 w-8 text-white" />
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div className="space-y-2">
                            <label htmlFor="username" className="text-sm text-muted-foreground">ชื่อผู้ใช้งาน</label>
                            <Input
                                id="username"
                                placeholder="username"
                                autoComplete="username"
                                className="h-12 bg-muted/50 border-border rounded-xl transition-colors"
                                value={formData.username}
                                onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm text-muted-foreground">รหัสผ่าน</label>
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
                                    onClick={() => setShowPassword(!showPassword)}
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

                        {hasTurnstile ? (
                            <div className="space-y-2">
                                <TurnstileWidget
                                    onTokenChange={handleTurnstileChange}
                                    resetSignal={turnstileResetSignal}
                                />
                                {turnstileError ? (
                                    <Alert variant="destructive" className="rounded-xl">
                                        <AlertDescription>{turnstileError}</AlertDescription>
                                    </Alert>
                                ) : null}
                            </div>
                        ) : null}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-300 to-blue-300 hover:from-purple-400 hover:to-blue-400 text-primary font-medium shadow-lg shadow-purple-200/50 transition-all"
                            disabled={isLoading || (hasTurnstile && !turnstileToken)}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    กำลังเข้าสู่ระบบ...
                                </>
                            ) : (
                                "เข้าสู่ระบบ"
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
                </div>
            </div>
        </div>
    );
}
