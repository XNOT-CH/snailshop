"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
    User,
    Mail,
    Lock,
    Image as ImageIcon,
    Loader2,
    CheckCircle,
    AlertTriangle,
    Save,
} from "lucide-react";
import { updateProfile, getCurrentUserProfile } from "@/lib/actions/user";
import { showLoading, hideLoading, showSuccessAlert, showErrorAlert } from "@/lib/swal";

interface UserProfile {
    id: string;
    name: string | null;
    username: string;
    email: string | null;
    image: string | null;
    role: string;
    creditBalance: string;
}

export default function ProfileSettingsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        image: "",
        password: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    // Fetch current profile on mount
    useEffect(() => {
        async function fetchProfile() {
            setIsFetching(true);
            const user = await getCurrentUserProfile();
            if (user) {
                setProfile(user as UserProfile);
                setFormData({
                    name: user.name || "",
                    email: user.email || "",
                    image: user.image || "",
                    password: "",
                    confirmPassword: "",
                });
            }
            setIsFetching(false);
        }
        fetchProfile();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        // Client-side password match check
        if (formData.password && formData.password !== formData.confirmPassword) {
            setErrors({ confirmPassword: ["รหัสผ่านไม่ตรงกัน"] });
            return;
        }

        setIsLoading(true);
        showLoading("กำลังบันทึก...");

        try {
            const result = await updateProfile(formData);

            hideLoading();

            if (result.success) {
                await showSuccessAlert("สำเร็จ!", result.message);
                // Clear password fields after success
                setFormData(prev => ({
                    ...prev,
                    password: "",
                    confirmPassword: "",
                }));
                // Refresh profile data
                const updated = await getCurrentUserProfile();
                if (updated) {
                    setProfile(updated as UserProfile);
                }
            } else {
                if (result.errors) {
                    setErrors(result.errors);
                }
                await showErrorAlert("เกิดข้อผิดพลาด", result.message);
            }
        } catch {
            hideLoading();
            await showErrorAlert("เกิดข้อผิดพลาด", "ไม่สามารถอัปเดตโปรไฟล์ได้");
        } finally {
            setIsLoading(false);
        }
    };

    const getInitials = (name: string | null, username: string) => {
        if (name) {
            return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
        }
        return username.slice(0, 2).toUpperCase();
    };

    const passwordsMatch = !formData.confirmPassword || formData.password === formData.confirmPassword;

    if (isFetching) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Alert className="max-w-md border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                        กรุณาเข้าสู่ระบบเพื่อแก้ไขโปรไฟล์
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container max-w-2xl mx-auto py-8 px-4">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-zinc-900 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                        <User className="h-7 w-7 text-blue-600" />
                    </div>
                    แก้ไขโปรไฟล์
                </h1>
                <p className="text-zinc-500 mt-2">
                    จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชีของคุณ
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Profile Picture Card */}
                <Card className="border-blue-100 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                            <ImageIcon className="h-5 w-5 text-blue-600" />
                            รูปโปรไฟล์
                        </CardTitle>
                        <CardDescription>
                            แสดงรูปโปรไฟล์ของคุณบนเว็บไซต์
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center gap-6">
                        <Avatar className="h-24 w-24 border-4 border-blue-100">
                            <AvatarImage src={formData.image || profile.image || ""} alt={profile.username} />
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xl font-semibold">
                                {getInitials(profile.name, profile.username)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="image">URL รูปโปรไฟล์</Label>
                            <Input
                                id="image"
                                type="url"
                                placeholder="https://example.com/your-photo.jpg"
                                value={formData.image}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        image: e.target.value,
                                    }))
                                }
                                className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                            />
                            {errors.image && (
                                <p className="text-sm text-red-500">{errors.image[0]}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Personal Info Card */}
                <Card className="border-blue-100 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                            <User className="h-5 w-5 text-blue-600" />
                            ข้อมูลส่วนตัว
                        </CardTitle>
                        <CardDescription>
                            ชื่อที่แสดงและข้อมูลติดต่อ
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Display Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name" className="flex items-center gap-2">
                                <User className="h-4 w-4 text-blue-600" />
                                ชื่อที่แสดง <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="กรอกชื่อของคุณ"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        name: e.target.value,
                                    }))
                                }
                                required
                                className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                            />
                            {errors.name && (
                                <p className="text-sm text-red-500">{errors.name[0]}</p>
                            )}
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-blue-600" />
                                อีเมล
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="example@email.com"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        email: e.target.value,
                                    }))
                                }
                                className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                            />
                            {errors.email && (
                                <p className="text-sm text-red-500">{errors.email[0]}</p>
                            )}
                        </div>

                        {/* Username (Read-only) */}
                        <div className="space-y-2">
                            <Label className="text-zinc-500">Username</Label>
                            <Input
                                value={profile.username}
                                disabled
                                className="bg-zinc-100 text-zinc-500"
                            />
                            <p className="text-xs text-zinc-400">Username ไม่สามารถเปลี่ยนได้</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Password Card */}
                <Card className="border-blue-100 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                            <Lock className="h-5 w-5 text-blue-600" />
                            เปลี่ยนรหัสผ่าน
                        </CardTitle>
                        <CardDescription>
                            ปล่อยว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัสผ่าน
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* New Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="flex items-center gap-2">
                                <Lock className="h-4 w-4 text-blue-600" />
                                รหัสผ่านใหม่
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                                value={formData.password}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        password: e.target.value,
                                    }))
                                }
                                className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                            />
                            {errors.password && (
                                <p className="text-sm text-red-500">{errors.password[0]}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                                <Lock className="h-4 w-4 text-blue-600" />
                                ยืนยันรหัสผ่าน
                            </Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="กรอกรหัสผ่านอีกครั้ง"
                                value={formData.confirmPassword}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        confirmPassword: e.target.value,
                                    }))
                                }
                                className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                            />
                            {errors.confirmPassword && (
                                <p className="text-sm text-red-500">{errors.confirmPassword[0]}</p>
                            )}
                        </div>

                        {/* Password Match Indicator */}
                        {formData.confirmPassword && (
                            <Alert
                                className={
                                    passwordsMatch
                                        ? "border-green-200 bg-green-50"
                                        : "border-red-200 bg-red-50"
                                }
                            >
                                {passwordsMatch ? (
                                    <>
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <AlertDescription className="text-green-700">
                                            รหัสผ่านตรงกัน
                                        </AlertDescription>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                        <AlertDescription className="text-red-700">
                                            รหัสผ่านไม่ตรงกัน
                                        </AlertDescription>
                                    </>
                                )}
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                <Separator />

                {/* Submit Button */}
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        size="lg"
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
                        disabled={isLoading || !passwordsMatch}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                กำลังบันทึก...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                บันทึกการเปลี่ยนแปลง
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
