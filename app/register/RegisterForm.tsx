"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showSuccess, showError } from "@/lib/swal";
import { normalizeCallbackUrl } from "@/lib/authRedirect";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, Gamepad2 } from "lucide-react";

interface RegisterFormProps {
    logoUrl: string | null;
}

export function RegisterForm({ logoUrl }: Readonly<RegisterFormProps>) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [turnstileError, setTurnstileError] = useState<string | null>(null);
    const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
    const [formData, setFormData] = useState({
        username: "",
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
    const hasTurnstile = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

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
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="bg-card rounded-2xl shadow-xl shadow-primary/10 p-8">
                    {/* Header with Logo */}
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-primary">สมัครสมาชิก</h1>
                            <p className="text-muted-foreground text-sm">Register</p>
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

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username */}
                        <div className="space-y-2">
                            <label htmlFor="reg-username" className="text-sm text-muted-foreground">ชื่อผู้ใช้งาน</label>
                            <Input
                                id="reg-username"
                                placeholder="username"
                                autoComplete="username"
                                className="h-12 bg-muted/50 border-border rounded-xl transition-colors"
                                minLength={3}
                                value={formData.username}
                                onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                                required
                            />
                        </div>

                        {/* PIN (optional) */}
                        <div className="space-y-2">
                            <label htmlFor="reg-pin" className="text-sm text-muted-foreground">
                                PIN 6 หลัก <span className="text-muted-foreground/60">(ไม่บังคับ)</span>
                            </label>
                            <Input
                                id="reg-pin"
                                placeholder="PIN 6 หลัก"
                                autoComplete="off"
                                className="h-12 bg-muted/50 border-border rounded-xl"
                                maxLength={6}
                                pattern="[0-9]*"
                                value={formData.pin}
                                onChange={(e) => setFormData((prev) => ({ ...prev, pin: e.target.value.replaceAll(/\D/g, "") }))}
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label htmlFor="reg-password" className="text-sm text-muted-foreground">รหัสผ่าน</label>
                            <div className="relative">
                                <Input
                                    id="reg-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    className="h-12 bg-muted/50 border-border rounded-xl pr-12 transition-colors"
                                    minLength={6}
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

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label htmlFor="reg-confirm-password" className="text-sm text-muted-foreground">ยืนยันรหัสผ่าน</label>
                            <div className="relative">
                                <Input
                                    id="reg-confirm-password"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                                    autoComplete="new-password"
                                    className="h-12 bg-muted/50 border-border rounded-xl pr-12"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    aria-label={showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Password Strength Indicator */}
                        {formData.password && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <span>ความปลอดภัยของรหัสผ่าน / Password strength</span>
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
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-300 to-blue-300 hover:from-purple-400 hover:to-blue-400 text-primary font-medium shadow-lg shadow-purple-200/50 transition-all mt-6"
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
                                "สมัครสมาชิก"
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
                </div>
            </div>
        </div>
    );
}
