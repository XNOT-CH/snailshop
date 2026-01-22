"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertModal } from "@/components/ui/AlertModal";
import { Loader2, Eye, EyeOff, Gamepad2 } from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [logoUrl, setLogoUrl] = useState("");
    const [formData, setFormData] = useState({
        username: "",
        pin: "",
        password: "",
        confirmPassword: "",
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            showAlert("รหัสผ่านไม่ตรงกัน", "error");
            return;
        }

        if (formData.password.length < 6) {
            showAlert("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร", "error");
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
                }),
            });

            const data = await response.json();

            if (data.success) {
                showAlert("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ", "success");
                setTimeout(() => {
                    router.push("/login");
                }, 1500);
            } else {
                showAlert(data.message, "error");
            }
        } catch (error) {
            showAlert("สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่", "error");
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
                                <h1 className="text-2xl font-bold text-primary">สมัครสมาชิก</h1>
                                <p className="text-slate-400 text-sm">Register</p>
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

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Username */}
                            <div className="space-y-2">
                                <label className="text-sm text-slate-600">ชื่อผู้ใช้งาน</label>
                                <Input
                                    placeholder="username"
                                    className="h-12 bg-blue-50/50 border-blue-100 rounded-xl focus:bg-white transition-colors"
                                    minLength={3}
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

                            {/* PIN (optional) */}
                            <div className="space-y-2">
                                <Input
                                    placeholder="PIN 6 หลัก"
                                    className="h-12 bg-white border-slate-200 rounded-xl"
                                    maxLength={6}
                                    pattern="[0-9]*"
                                    value={formData.pin}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            pin: e.target.value.replace(/\D/g, ""),
                                        }))
                                    }
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
                                        minLength={6}
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

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <div className="relative">
                                    <Input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                                        className="h-12 bg-white border-slate-200 rounded-xl pr-12"
                                        value={formData.confirmPassword}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                confirmPassword: e.target.value,
                                            }))
                                        }
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Password Strength Indicator */}
                            {formData.password && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1 text-sm text-slate-500">
                                        <span>ความปลอดภัยของรหัสผ่าน / Password strength</span>
                                    </div>
                                    <div className="flex gap-1 items-center">
                                        {[1, 2, 3, 4, 5].map((level) => (
                                            <div
                                                key={level}
                                                className={`h-1 flex-1 rounded-full transition-colors ${level <= passwordStrength.level
                                                    ? passwordStrength.color
                                                    : "bg-slate-200"
                                                    }`}
                                            />
                                        ))}
                                        <span className={`text-xs ml-2 ${passwordStrength.level <= 2 ? "text-red-500" : "text-green-600"
                                            }`}>
                                            {passwordStrength.text}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-300 to-blue-300 hover:from-purple-400 hover:to-blue-400 text-primary font-medium shadow-lg shadow-purple-200/50 transition-all mt-6"
                                disabled={isLoading || !!(formData.confirmPassword && !passwordsMatch)}
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
                            <p className="text-center text-sm text-slate-500">
                                ถ้ามีบัญชีแล้ว{" "}
                                <Link
                                    href="/login"
                                    className="font-medium text-primary hover:underline"
                                >
                                    เข้าสู่ระบบเลย!
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
