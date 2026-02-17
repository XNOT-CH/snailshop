"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { showSuccess, showError, showWarning } from "@/lib/swal";
import { compressImage } from "@/lib/compressImage";
import {
    Wallet,
    Upload,
    Loader2,
    CheckCircle,
    X,
    Copy,
    Check,
    AlertTriangle,
    Building2,
    CreditCard,
    User,
} from "lucide-react";

// Bank info - These can be moved to Admin Settings later
const BANK_INFO = {
    bankName: "ธนาคารกสิกรไทย",
    accountName: "บจก. เกมสโตร์",
    accountNumber: "123-4-56789-0",
    bankLogo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Image_created_with_a_mobile_phone.png/1200px-Image_created_with_a_mobile_phone.png",
};

export default function TopupPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [slipFile, setSlipFile] = useState<File | null>(null);
    const [slipPreview, setSlipPreview] = useState<string>("");
    const [copied, setCopied] = useState(false);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    // Handle file selection
    const handleFileSelect = useCallback(async (file: File) => {
        if (!file.type.startsWith("image/")) {
            showError("กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showError("ขนาดไฟล์ต้องไม่เกิน 10MB");
            return;
        }

        try {
            const compressed = await compressImage(file);
            setSlipFile(compressed);
            const reader = new FileReader();
            reader.onload = (e) => {
                setSlipPreview(e.target?.result as string);
            };
            reader.readAsDataURL(compressed);
        } catch (error) {
            showError(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการประมวลผลภาพ");
        }
    }, []);

    // Drag and drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const removeSlip = () => {
        setSlipFile(null);
        setSlipPreview("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async () => {
        if (!slipFile) {
            showWarning("กรุณาอัปโหลดสลิปการโอนเงิน");
            return;
        }

        setIsLoading(true);

        try {
            // Convert file to base64 for API
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64 = e.target?.result as string;

                // TODO: Call slip verification API here
                // For now, send to existing topup API with base64 image
                const response = await fetch("/api/topup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        amount: 0, // Will be detected from slip
                        proofImage: base64,
                    }),
                });

                const data = await response.json();

                if (data.success) {
                    showSuccess(data.message);
                    removeSlip();
                    router.refresh();
                } else {
                    showError(data.message);
                }
                setIsLoading(false);
            };
            reader.readAsDataURL(slipFile);
        } catch (error) {
            showError("ไม่สามารถส่งข้อมูลได้ กรุณาลองใหม่");
            setIsLoading(false);
        }
    };

    return (
        <div className="py-8 bg-card/90 backdrop-blur-sm rounded-2xl px-6 shadow-xl shadow-primary/10 animate-page-enter">
            {/* Breadcrumb */}
            <PageBreadcrumb
                items={[
                    { label: "แดชบอร์ด", href: "/dashboard" },
                    { label: "เติมเงิน" },
                ]}
                className="mb-6"
            />

            {/* Page Header */}
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
                    <Wallet className="h-7 w-7" />
                    แนบสลิป
                </h1>
                <p className="text-muted-foreground mt-1">Mobile Banking</p>
            </div>

            {/* Main Content */}
            <div className="max-w-2xl mx-auto">
                <Card className="border-0 shadow-lg">
                    <CardContent className="p-6">
                        {/* Bank Info Section */}
                        <div className="flex items-center justify-center gap-4 mb-6">
                            {/* Bank Logos */}
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                                    <Building2 className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span className="text-xs text-green-600">พร้อมรับโอน</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Account Details */}
                        <div className="bg-muted/50 rounded-xl p-4 mb-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                                <div>
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                                        <User className="h-3 w-3" />
                                        ชื่อบัญชี
                                    </div>
                                    <p className="font-semibold text-primary">{BANK_INFO.accountName}</p>
                                </div>
                                <div>
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                                        <Building2 className="h-3 w-3" />
                                        ธนาคาร
                                    </div>
                                    <p className="font-semibold text-primary">{BANK_INFO.bankName}</p>
                                </div>
                            </div>

                            {/* Account Number with Copy */}
                            <div className="mt-4 text-center">
                                <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                                    <CreditCard className="h-3 w-3" />
                                    เลขบัญชี
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-xl font-bold text-primary tracking-wider">
                                        {BANK_INFO.accountNumber}
                                    </span>
                                    <button
                                        onClick={() => copyToClipboard(BANK_INFO.accountNumber.replace(/-/g, ""))}
                                        className="p-1 rounded hover:bg-muted transition-colors"
                                        title="คัดลอก"
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Upload Slip Section */}
                        <div className="space-y-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileInputChange}
                                className="hidden"
                                id="slip-upload"
                            />

                            {!slipPreview ? (
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`
                                            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                                            transition-all duration-200
                                            ${isDragging
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                                        }
                                        `}
                                >
                                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                                    <p className="text-muted-foreground font-medium">
                                        ลาก & วาง เพื่ออัปโหลด
                                    </p>
                                    <p className="text-muted-foreground text-sm mt-1">หรือ</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-2 rounded-full"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            fileInputRef.current?.click();
                                        }}
                                    >
                                        อัปโหลดไฟล์
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative rounded-xl border border-border p-2">
                                    <button
                                        onClick={removeSlip}
                                        className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors z-10"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                    <img
                                        src={slipPreview}
                                        alt="สลิปการโอนเงิน"
                                        className="w-full max-h-64 object-contain rounded-lg"
                                    />
                                    <p className="text-center text-xs text-muted-foreground mt-2">
                                        {slipFile?.name}
                                    </p>
                                </div>
                            )}

                            {/* Warning */}
                            <div className="flex items-center gap-2 justify-center text-amber-600 dark:text-amber-400 text-sm bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                <span>กรุณาโอนผ่านแอปธนาคารเท่านั้น ระบบไม่รองรับการโอนด้วยตู้เอทีเอ็ม</span>
                            </div>

                            {/* Submit Button */}
                            <Button
                                onClick={handleSubmit}
                                className="w-full gap-2 rounded-xl bg-primary hover:bg-primary/90"
                                size="lg"
                                disabled={isLoading || !slipFile}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        กำลังตรวจสอบ...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4" />
                                        ส่งหลักฐานการโอน
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
