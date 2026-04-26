"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { showError, showSuccess } from "@/lib/swal";
import { Loader2, Gamepad2, Mail } from "lucide-react";

interface ForgotPasswordFormProps {
    readonly logoUrl: string | null;
}

export function ForgotPasswordForm({ logoUrl }: Readonly<ForgotPasswordFormProps>) {
    const [identifier, setIdentifier] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [turnstileError, setTurnstileError] = useState<string | null>(null);
    const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
    const hasTurnstile = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

    const handleTurnstileChange = useCallback((token: string | null) => {
        setTurnstileToken(token);
        if (token) {
            setTurnstileError(null);
        }
    }, []);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (hasTurnstile && !turnstileToken) {
            setTurnstileError("กรุณายืนยันว่าไม่ใช่บอทก่อนส่งคำขอ");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    identifier,
                    turnstileToken,
                }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                showError(data.message || "ส่งคำขอรีเซ็ตรหัสผ่านไม่สำเร็จ");
                return;
            }

            showSuccess(data.message || "หากบัญชีนี้มีอีเมล เราจะส่งลิงก์รีเซ็ตให้ในไม่กี่นาที");
            setIdentifier("");
        } catch {
            showError("ส่งคำขอรีเซ็ตรหัสผ่านไม่สำเร็จ กรุณาลองใหม่");
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
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-primary">ลืมรหัสผ่าน</h1>
                            <p className="text-muted-foreground text-sm">Password Reset</p>
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
                        <div className="space-y-2">
                            <label htmlFor="identifier" className="text-sm text-muted-foreground">
                                อีเมลหรือชื่อผู้ใช้
                            </label>
                            <div className="relative">
                                <Input
                                    id="identifier"
                                    type="text"
                                    placeholder="name@example.com หรือ username"
                                    autoComplete="username"
                                    className="h-12 bg-muted/50 border-border rounded-xl pl-11"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    required
                                />
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            </div>
                            <p className="text-xs leading-5 text-muted-foreground">
                                หากบัญชีนี้มีอีเมลที่ใช้งานได้ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้โดยไม่เปิดเผยรายละเอียดบัญชี
                            </p>
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

                        <Button
                            type="submit"
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-300 to-blue-300 hover:from-purple-400 hover:to-blue-400 text-primary font-medium shadow-lg shadow-purple-200/50 transition-all"
                            disabled={isLoading || (hasTurnstile && !turnstileToken)}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    กำลังส่งลิงก์...
                                </>
                            ) : (
                                "ส่งลิงก์รีเซ็ตรหัสผ่าน"
                            )}
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            <Link href="/login" className="font-medium text-primary hover:underline">
                                กลับไปหน้าเข้าสู่ระบบ
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
