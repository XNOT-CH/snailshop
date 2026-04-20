"use client";

import { useMemo, useState } from "react";
import { KeyRound, Loader2, LockKeyhole, RotateCcw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { resetUserPin, updateUserPin } from "@/lib/actions/pin";
import { hideLoading, showErrorAlert, showLoading, showSuccessAlert } from "@/lib/swal";

interface PinSettingsCardProps {
    hasPin: boolean;
    pinLockedUntil?: string | null;
    pinUpdatedAt?: string | null;
    onUpdated: () => Promise<void> | void;
}

export function PinSettingsCard({
    hasPin,
    pinLockedUntil,
    pinUpdatedAt,
    onUpdated,
}: Readonly<PinSettingsCardProps>) {
    const [isSaving, setIsSaving] = useState(false);
    const [isResetMode, setIsResetMode] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [formData, setFormData] = useState({
        currentPassword: "",
        currentPin: "",
        newPin: "",
        confirmPin: "",
    });

    const isLocked = useMemo(() => {
        if (!pinLockedUntil) return false;
        return new Date(pinLockedUntil).getTime() > Date.now();
    }, [pinLockedUntil]);

    const cardClass = "border border-slate-200/80 bg-white/95 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.28)]";
    const saveButtonClass =
        "h-11 w-full gap-2 rounded-2xl bg-blue-600 px-6 text-white shadow-[0_16px_30px_-18px_rgba(37,99,235,0.75)] transition hover:bg-blue-700 hover:shadow-[0_18px_36px_-18px_rgba(29,78,216,0.75)] sm:w-auto sm:min-w-[148px]";

    const resetForm = () => {
        setFormData({
            currentPassword: "",
            currentPin: "",
            newPin: "",
            confirmPin: "",
        });
        setIsResetMode(false);
    };

    const handleSubmit = async () => {
        setErrors({});
        setIsSaving(true);
        showLoading("กำลังบันทึก PIN...");

        try {
            const result = isResetMode
                ? await resetUserPin({
                    currentPassword: formData.currentPassword,
                    newPin: formData.newPin,
                    confirmPin: formData.confirmPin,
                })
                : await updateUserPin({
                    hasExistingPin: hasPin,
                    currentPassword: formData.currentPassword,
                    currentPin: formData.currentPin,
                    newPin: formData.newPin,
                    confirmPin: formData.confirmPin,
                });

            hideLoading();

            if (!result.success) {
                if (result.errors) setErrors(result.errors);
                await showErrorAlert("บันทึก PIN ไม่สำเร็จ", result.message);
                return;
            }

            resetForm();
            await onUpdated();
            await showSuccessAlert("สำเร็จ!", result.message);
        } catch {
            hideLoading();
            await showErrorAlert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึก PIN ได้");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className={cardClass}>
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg text-blue-600">
                    <LockKeyhole className="h-5 w-5" />
                    ความปลอดภัยด้วย PIN
                </CardTitle>
                <CardDescription>
                    ใช้ PIN 6 หลักสำหรับยืนยันรายการสำคัญในอนาคต
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-600" />
                        <div className="space-y-1 text-sm">
                            <p className="font-medium text-foreground">
                                สถานะ PIN: {hasPin ? "เปิดใช้งานแล้ว" : "ยังไม่ได้ตั้งค่า"}
                            </p>
                            {pinUpdatedAt ? (
                                <p className="text-muted-foreground">
                                    อัปเดตล่าสุด: {new Date(pinUpdatedAt).toLocaleString("th-TH")}
                                </p>
                            ) : (
                                <p className="text-muted-foreground">
                                    ตั้ง PIN ครั้งแรกได้จากฟอร์มด้านล่าง
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {isLocked ? (
                    <Alert className="border-red-200 bg-red-50 text-red-700">
                        <AlertDescription>
                            PIN ถูกล็อกชั่วคราวจนถึง {new Date(pinLockedUntil!).toLocaleString("th-TH")}
                        </AlertDescription>
                    </Alert>
                ) : null}

                {hasPin && !isResetMode ? (
                    <div className="space-y-2">
                        <Label htmlFor="currentPin">PIN ปัจจุบัน</Label>
                        <Input
                            id="currentPin"
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="กรอก PIN ปัจจุบัน 6 หลัก"
                            value={formData.currentPin}
                            onChange={(e) => setFormData((prev) => ({ ...prev, currentPin: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                            className="bg-muted/50 border-border"
                        />
                        {errors.currentPin ? <p className="text-sm text-red-500">{errors.currentPin[0]}</p> : null}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Label htmlFor="currentPasswordForPin">รหัสผ่านปัจจุบัน</Label>
                        <Input
                            id="currentPasswordForPin"
                            type="password"
                            placeholder="กรอกรหัสผ่านเพื่อยืนยันตัวตน"
                            value={formData.currentPassword}
                            onChange={(e) => setFormData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                            className="bg-muted/50 border-border"
                        />
                        {errors.currentPassword ? <p className="text-sm text-red-500">{errors.currentPassword[0]}</p> : null}
                    </div>
                )}

                {hasPin ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm">
                        <p className="text-muted-foreground">
                            ลืม PIN หรือ PIN ถูกล็อก? คุณสามารถรีเซ็ตด้วยรหัสผ่านบัญชีได้
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                                setErrors({});
                                setIsResetMode((prev) => !prev);
                                setFormData((prev) => ({ ...prev, currentPin: "", currentPassword: "" }));
                            }}
                        >
                            <RotateCcw className="h-4 w-4" />
                            {isResetMode ? "กลับไปใช้ PIN ปัจจุบัน" : "รีเซ็ตด้วยรหัสผ่าน"}
                        </Button>
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="newPin">PIN ใหม่</Label>
                        <Input
                            id="newPin"
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="PIN 6 หลัก"
                            value={formData.newPin}
                            onChange={(e) => setFormData((prev) => ({ ...prev, newPin: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                            className="bg-muted/50 border-border"
                        />
                        {errors.newPin ? <p className="text-sm text-red-500">{errors.newPin[0]}</p> : null}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPin">ยืนยัน PIN</Label>
                        <Input
                            id="confirmPin"
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="กรอก PIN อีกครั้ง"
                            value={formData.confirmPin}
                            onChange={(e) => setFormData((prev) => ({ ...prev, confirmPin: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                            className="bg-muted/50 border-border"
                        />
                        {errors.confirmPin ? <p className="text-sm text-red-500">{errors.confirmPin[0]}</p> : null}
                    </div>
                </div>

                <div className="flex justify-end pt-3">
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        className={saveButtonClass}
                        disabled={isSaving || (isLocked && !isResetMode)}
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                        {isResetMode ? "รีเซ็ต PIN" : hasPin ? "เปลี่ยน PIN" : "ตั้งค่า PIN"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
