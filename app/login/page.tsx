"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertModal } from "@/components/ui/AlertModal";
import { Loader2, Eye, EyeOff, Gamepad2 } from "lucide-react";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [logoUrl, setLogoUrl] = useState("");
    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });
    const [alertState, setAlertState] = useState<{
        isOpen: boolean;
        description: string;
        variant: "success" | "error" | "warning" | "info";
    }>({
        isOpen: false,
        description: "",
        variant: "info",
    });

    // Fetch logo from settings
    useEffect(() => {
        const fetchLogo = async () => {
            try {
                const res = await fetch("/api/admin/settings");
                const data = await res.json();
                if (data.success && data.data?.logoUrl) {
                    setLogoUrl(data.data.logoUrl);
                }
            } catch (error) {
                console.error("Failed to fetch logo:", error);
            }
        };
        fetchLogo();
    }, []);

    const showAlert = (description: string, variant: "success" | "error" | "warning" | "info") => {
        setAlertState({ isOpen: true, description, variant });
    };

    const closeAlert = () => {
        setAlertState(prev => ({ ...prev, isOpen: false }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                // Set HTTP-only cookie via server-side API (more secure)
                await fetch("/api/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: data.user.id, rememberMe }),
                });
                window.location.href = "/";
            } else {
                showAlert(data.message, "error");
            }
        } catch (error) {
            showAlert("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="min-h-screen flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">
                    {/* Card */}
                    <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/50 p-8">
                        {/* Header with Logo */}
                        <div className="flex items-start justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-primary">เข้าสู่ระบบ</h1>
                                <p className="text-slate-400 text-sm">Login</p>
                            </div>
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt="Logo"
                                    className="h-16 w-16 rounded-xl object-contain"
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
                                <label className="text-sm text-slate-600">ชื่อผู้ใช้งาน</label>
                                <Input
                                    placeholder="username"
                                    className="h-12 bg-blue-50/50 border-blue-100 rounded-xl focus:bg-white transition-colors"
                                    value={formData.username}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            username: e.target.value,
                                        }))
                                    }
                                    required
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label className="text-sm text-slate-600">รหัสผ่าน</label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="h-12 bg-blue-50/50 border-blue-100 rounded-xl pr-12 focus:bg-white transition-colors"
                                        value={formData.password}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                password: e.target.value,
                                            }))
                                        }
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Remember Me & Forgot Password */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="remember"
                                        checked={rememberMe}
                                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                                        className="border-slate-300"
                                    />
                                    <label htmlFor="remember" className="text-sm text-slate-500 cursor-pointer">
                                        จดจำการเข้าสู่ระบบ
                                    </label>
                                </div>
                                <Link href="#" className="text-sm text-slate-500 hover:text-primary transition-colors">
                                    ลืมรหัสผ่าน
                                </Link>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-300 to-blue-300 hover:from-purple-400 hover:to-blue-400 text-primary font-medium shadow-lg shadow-purple-200/50 transition-all"
                                disabled={isLoading}
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
                            <p className="text-center text-sm text-slate-500">
                                ถ้ายังไม่มีบัญชี{" "}
                                <Link
                                    href="/register"
                                    className="font-medium text-primary hover:underline"
                                >
                                    สมัครสมาชิกเลย!
                                </Link>
                            </p>
                        </form>
                    </div>
                </div>
            </div>

            {/* Alert Modal */}
            <AlertModal
                isOpen={alertState.isOpen}
                onClose={closeAlert}
                description={alertState.description}
                variant={alertState.variant}
            />
        </>
    );
}
