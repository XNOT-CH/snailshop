"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showSuccess, showError } from "@/lib/swal";
import { normalizeCallbackUrl } from "@/lib/authRedirect";
import { AuthFormShell } from "@/components/auth/AuthFormShell";
import { TurnstileField } from "@/components/auth/TurnstileField";
import { Loader2, Eye, EyeOff, UserPlus } from "lucide-react";

interface RegisterFormProps {
    logoUrl: string | null;
    hasTurnstile: boolean;
}

export function RegisterForm({ logoUrl, hasTurnstile }: Readonly<RegisterFormProps>) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [turnstileError, setTurnstileError] = useState<string | null>(null);
    const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        pin: "",
        password: "",
        confirmPassword: "",
    });

    // Calculate password strength
    const getPasswordStrength = (password: string): { level: number; text: string; color: string } => {
        if (!password) return { level: 0, text: "", color: "" };

        let score = 0;
        if (password.length >= 6) score++;
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

        if (score <= 1) return { level: 1, text: "อ่อน", color: "bg-red-500" };
        if (score <= 2) return { level: 2, text: "พอใช้", color: "bg-orange-500" };
        if (score <= 3) return { level: 3, text: "ปานกลาง", color: "bg-yellow-500" };
        if (score <= 4) return { level: 4, text: "ดี", color: "bg-green-400" };
        return { level: 5, text: "แข็งแกร่ง", color: "bg-green-600" };
    };

    const passwordStrength = getPasswordStrength(formData.password);
    const passwordsMatch = formData.password && formData.password === formData.confirmPassword;
    const callbackUrl = normalizeCallbackUrl(searchParams.get("callbackUrl"));
    const handleTurnstileChange = useCallback((token: string | null) => {
        setTurnstileToken(token);
        if (token) {
            setTurnstileError(null);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            showError("รหัสผ่านไม่ตรงกัน");
            return;
        }

        if (formData.password.length < 6) {
            showError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
            return;
        }

        if (hasTurnstile && !turnstileToken) {
            setTurnstileError("กรุณายืนยันว่าไม่ใช่บอทก่อนสมัครสมาชิก");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    pin: formData.pin,
                    password: formData.password,
                    confirmPassword: formData.confirmPassword,
                    turnstileToken,
                }),
            });

            const data = await response.json();

            if (data.success) {
                showSuccess("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ");
                setTimeout(() => {
                    router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
                }, 1500);
            } else {
                showError(data.message);
            }
        } catch {
            showError("สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่");
        } finally {
            if (hasTurnstile) {
                setTurnstileResetSignal((prev) => prev + 1);
            }
            setIsLoading(false);
        }
    };

    return (
        <AuthFormShell logoUrl={logoUrl} title="สมัครสมาชิก" subtitle="สร้างบัญชีใหม่ ใช้เวลาไม่ถึงนาที" fullHeight={false} variant="separated">
                    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                        {/* Username */}
                        <div className="space-y-2">
                            <label htmlFor="reg-username" className="text-sm text-[#5f6f82] dark:text-muted-foreground">ชื่อผู้ใช้งาน <span className="text-red-500" aria-hidden="true">*</span></label>
                            <Input
                                id="reg-username"
                                placeholder="ตั้งชื่อผู้ใช้งาน (อย่างน้อย 3 ตัวอักษร)"
                                autoComplete="username"
                                className="h-12 rounded-xl border-[#cfd6df] bg-white text-[#102033] shadow-inner shadow-slate-100 transition-colors placeholder:text-[#7a8796] focus-visible:ring-[#145de7] dark:border-border dark:bg-muted/50 dark:text-foreground"
                                minLength={3}
                                value={formData.username}
                                onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                                required
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label htmlFor="reg-email" className="text-sm text-[#5f6f82] dark:text-muted-foreground">อีเมล <span className="text-red-500" aria-hidden="true">*</span></label>
                            <Input
                                id="reg-email"
                                type="email"
                                placeholder="กรอกอีเมลของคุณ"
                                autoComplete="email"
                                className="h-12 rounded-xl border-[#cfd6df] bg-white text-[#102033] shadow-inner shadow-slate-100 transition-colors placeholder:text-[#7a8796] focus-visible:ring-[#145de7] dark:border-border dark:bg-muted/50 dark:text-foreground"
                                value={formData.email}
                                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label htmlFor="reg-password" className="text-sm text-[#5f6f82] dark:text-muted-foreground">รหัสผ่าน <span className="text-red-500" aria-hidden="true">*</span></label>
                            <div className="relative">
                                <Input
                                    id="reg-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    className="h-12 rounded-xl border-[#cfd6df] bg-white pr-12 text-[#102033] shadow-inner shadow-slate-100 transition-colors placeholder:text-[#7a8796] focus-visible:ring-[#145de7] dark:border-border dark:bg-muted/50 dark:text-foreground"
                                    minLength={6}
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

                        {/* Password Strength Indicator */}
                        {formData.password && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <span>ความปลอดภัยของรหัสผ่าน</span>
                                </div>
                                <div className="flex gap-1 items-center">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                        <div
                                            key={level}
                                            className={`h-1 flex-1 rounded-full transition-colors ${level <= passwordStrength.level ? passwordStrength.color : "bg-muted"
                                                }`}
                                        />
                                    ))}
                                    <span className={`text-xs ml-2 ${passwordStrength.level <= 2 ? "text-red-500" : "text-green-600"}`}>
                                        {passwordStrength.text}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label htmlFor="reg-confirm-password" className="text-sm text-[#5f6f82] dark:text-muted-foreground">ยืนยันรหัสผ่าน <span className="text-red-500" aria-hidden="true">*</span></label>
                            <Input
                                id="reg-confirm-password"
                                type="password"
                                placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                                autoComplete="new-password"
                                aria-invalid={Boolean(formData.confirmPassword && !passwordsMatch)}
                                className="h-12 rounded-xl border-[#cfd6df] bg-white text-[#102033] shadow-inner shadow-slate-100 placeholder:text-[#7a8796] focus-visible:ring-[#145de7] dark:border-border dark:bg-muted/50 dark:text-foreground"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                required
                            />
                            {formData.confirmPassword && !passwordsMatch ? (
                                <p className="text-xs text-red-500">รหัสผ่านไม่ตรงกัน</p>
                            ) : null}
                        </div>

                        {/* PIN (optional) */}
                        <div className="space-y-2">
                            <label htmlFor="reg-pin" className="text-sm text-[#5f6f82] dark:text-muted-foreground">
                                PIN 6 หลัก <span className="text-muted-foreground/60">(ไม่บังคับ ตั้งภายหลังได้)</span>
                            </label>
                            <Input
                                id="reg-pin"
                                placeholder="ตัวเลข 6 หลัก"
                                autoComplete="off"
                                inputMode="numeric"
                                className="h-12 rounded-xl border-[#cfd6df] bg-white text-[#102033] shadow-inner shadow-slate-100 placeholder:text-[#7a8796] focus-visible:ring-[#145de7] dark:border-border dark:bg-muted/50 dark:text-foreground"
                                maxLength={6}
                                pattern="[0-9]*"
                                value={formData.pin}
                                onChange={(e) => setFormData((prev) => ({ ...prev, pin: e.target.value.replaceAll(/\D/g, "") }))}
                            />
                        </div>

                        <TurnstileField
                            enabled={hasTurnstile}
                            onTokenChange={handleTurnstileChange}
                            resetSignal={turnstileResetSignal}
                            error={turnstileError}
                        />

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-12 rounded-xl font-semibold shadow-none transition-colors mt-6"
                            disabled={
                                isLoading
                                || Boolean(formData.confirmPassword && !passwordsMatch)
                                || (hasTurnstile && !turnstileToken)
                            }
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    กำลังสมัคร...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-4 w-4" />
                                    สมัครสมาชิก
                                </>
                            )}
                        </Button>

                        {/* Login Link */}
                        <p className="text-center text-sm text-muted-foreground">
                            ถ้ามีบัญชีแล้ว{" "}
                            <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-primary hover:underline">
                                เข้าสู่ระบบเลย!
                            </Link>
                        </p>
                    </form>
        </AuthFormShell>
    );
}
