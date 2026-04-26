"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showError, showSuccess } from "@/lib/swal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Gamepad2, Loader2 } from "lucide-react";

interface ResetPasswordFormProps {
    readonly logoUrl: string | null;
}

export function ResetPasswordForm({ logoUrl }: Readonly<ResetPasswordFormProps>) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingToken, setIsCheckingToken] = useState(true);
    const [tokenError, setTokenError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function validateToken() {
            if (!token) {
                setTokenError("ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง");
                setIsCheckingToken(false);
                return;
            }

            try {
                const response = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`, {
                    method: "GET",
                    cache: "no-store",
                });
                const data = await response.json();

                if (!cancelled) {
                    setTokenError(response.ok && data.valid ? null : data.message || "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง");
                    setIsCheckingToken(false);
                }
            } catch {
                if (!cancelled) {
                    setTokenError("ไม่สามารถตรวจสอบลิงก์รีเซ็ตรหัสผ่านได้");
                    setIsCheckingToken(false);
                }
            }
        }

        void validateToken();

        return () => {
            cancelled = true;
        };
    }, [token]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!token) {
            showError("ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง");
            return;
        }

        if (password !== confirmPassword) {
            showError("รหัสผ่านไม่ตรงกัน");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    password,
                    confirmPassword,
                }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                showError(data.message || "ตั้งรหัสผ่านใหม่ไม่สำเร็จ");
                return;
            }

            showSuccess(data.message || "ตั้งรหัสผ่านใหม่สำเร็จ");
            setTimeout(() => {
                router.push("/login");
            }, 1200);
        } catch {
            showError("ตั้งรหัสผ่านใหม่ไม่สำเร็จ กรุณาลองใหม่");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="bg-card rounded-2xl shadow-xl shadow-primary/10 p-8">
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-primary">ตั้งรหัสผ่านใหม่</h1>
                            <p className="text-muted-foreground text-sm">Reset Password</p>
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

                    {isCheckingToken ? (
                        <div className="flex min-h-40 items-center justify-center text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            กำลังตรวจสอบลิงก์...
                        </div>
                    ) : tokenError ? (
                        <div className="space-y-4">
                            <Alert variant="destructive" className="rounded-xl">
                                <AlertDescription>{tokenError}</AlertDescription>
                            </Alert>
                            <Link href="/forgot-password" className="block text-center text-sm font-medium text-primary hover:underline">
                                ขอรับลิงก์ใหม่
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm text-muted-foreground">รหัสผ่านใหม่</label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="อย่างน้อย 6 ตัวอักษร"
                                        autoComplete="new-password"
                                        className="h-12 bg-muted/50 border-border rounded-xl pr-12"
                                        minLength={6}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
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

                            <div className="space-y-2">
                                <label htmlFor="confirm-password" className="text-sm text-muted-foreground">ยืนยันรหัสผ่านใหม่</label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                                    autoComplete="new-password"
                                    className="h-12 bg-muted/50 border-border rounded-xl"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-300 to-blue-300 hover:from-purple-400 hover:to-blue-400 text-primary font-medium shadow-lg shadow-purple-200/50 transition-all"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        กำลังบันทึกรหัสผ่าน...
                                    </>
                                ) : (
                                    "บันทึกรหัสผ่านใหม่"
                                )}
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
