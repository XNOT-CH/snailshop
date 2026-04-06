"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { showSuccess, showError, showWarning } from "@/lib/swal";
import { fetchWithCsrf } from "@/lib/csrf-client";
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
    ShieldCheck,
    ImagePlus,
} from "lucide-react";
import { useMaintenanceStatus } from "@/hooks/useMaintenanceStatus";

const BANK_INFO = {
    bankName: "ธนาคารกสิกรไทย",
    accountName: "บจก. เกมสโตร์",
    accountNumber: "123-4-56789-0",
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function formatCurrency(value: string) {
    const numeric = Number(value || 0);
    if (Number.isNaN(numeric)) return "0";
    return numeric.toLocaleString("th-TH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

export default function TopupPage() {
    const router = useRouter();
    const maintenance = useMaintenanceStatus().topup;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [slipFile, setSlipFile] = useState<File | null>(null);
    const [slipPreview, setSlipPreview] = useState("");
    const [topupAmount, setTopupAmount] = useState("");
    const [copied, setCopied] = useState(false);

    const hasValidAmount = useMemo(() => {
        const amount = Number(topupAmount);
        return Number.isFinite(amount) && amount > 0;
    }, [topupAmount]);

    const canSubmit = Boolean(slipFile) && hasValidAmount && !isSubmitting && !maintenance?.enabled;

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
            showError("ไม่สามารถคัดลอกเลขบัญชีได้");
        }
    };

    const handleFileSelect = useCallback((file: File) => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
            showError("กรุณาอัปโหลดไฟล์ JPG, PNG หรือ WebP เท่านั้น");
            return;
        }

        if (file.size > MAX_FILE_BYTES) {
            showError("ขนาดไฟล์ต้องไม่เกิน 5MB");
            return;
        }

        if (slipPreview) {
            URL.revokeObjectURL(slipPreview);
        }

        const previewUrl = URL.createObjectURL(file);
        setSlipFile(file);
        setSlipPreview(previewUrl);
    }, [slipPreview]);

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
        if (slipPreview) {
            URL.revokeObjectURL(slipPreview);
        }
        setSlipFile(null);
        setSlipPreview("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async () => {
        if (maintenance?.enabled) {
            showWarning(maintenance.message);
            return;
        }

        if (!slipFile) {
            showWarning("กรุณาอัปโหลดสลิปการโอน");
            return;
        }

        if (!hasValidAmount) {
            showWarning("กรุณากรอกจำนวนเงินที่โอนให้ถูกต้อง");
            return;
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append("file", slipFile);
            formData.append("amount", topupAmount);

            const response = await fetchWithCsrf("/api/topup", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showSuccess(data.message);
                removeSlip();
                setTopupAmount("");
                router.refresh();
                return;
            }

            showError(data.message || "ไม่สามารถส่งสลิปได้");
        } catch (error) {
            console.error("[TOPUP_SUBMIT]", error);
            showError("ไม่สามารถส่งข้อมูลได้ กรุณาลองใหม่");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="animate-page-enter rounded-2xl bg-card/90 px-4 py-6 shadow-xl shadow-primary/10 backdrop-blur-sm sm:px-5 sm:py-8">
            <PageBreadcrumb
                items={[
                    { label: "แดชบอร์ด", href: "/dashboard" },
                    { label: "เติมเงิน" },
                ]}
                className="mb-6"
            />

            <div className="mb-6 text-center">
                <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-primary">
                    <Wallet className="h-7 w-7" />
                    แนบสลิป
                </h1>
                <p className="mt-1 text-muted-foreground">Mobile Banking</p>
            </div>

            <div className="mx-auto max-w-2xl">
                <Card className="border-0 shadow-lg">
                    <CardContent className="space-y-6 p-6">
                        {maintenance?.enabled && (
                            <div className="rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                <p className="font-semibold">ระบบเติมเงินกำลังปิดปรับปรุงชั่วคราว</p>
                                <p className="mt-1 text-xs text-amber-800/90">{maintenance.message}</p>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
                                <ShieldCheck className="h-5 w-5 text-white" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-semibold text-emerald-700">พร้อมรับโอนและรองรับการตรวจสลิป</p>
                                <p className="text-xs text-emerald-600">ตอนนี้ส่งสลิปได้จริง และภายหลังสามารถต่อ API ตรวจสลิปอัตโนมัติได้ทันที</p>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-muted/50 p-4">
                            <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-2">
                                <div>
                                    <div className="mb-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                        <User className="h-3 w-3" />
                                        ชื่อบัญชี
                                    </div>
                                    <p className="font-semibold text-primary">{BANK_INFO.accountName}</p>
                                </div>
                                <div>
                                    <div className="mb-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                        <Building2 className="h-3 w-3" />
                                        ธนาคาร
                                    </div>
                                    <p className="font-semibold text-primary">{BANK_INFO.bankName}</p>
                                </div>
                            </div>

                            <div className="mt-4 rounded-2xl border border-border bg-background px-4 py-3 text-center">
                                <div className="mb-1 flex items-center justify-center gap-1 text-xs text-slate-400">
                                    <CreditCard className="h-3 w-3" />
                                    เลขบัญชี
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-xl font-bold tracking-wider text-primary">
                                        {BANK_INFO.accountNumber}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-1 rounded-full px-3"
                                        onClick={() => copyToClipboard(BANK_INFO.accountNumber.replaceAll("-", ""))}
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="h-4 w-4 text-emerald-500" />
                                                คัดลอกแล้ว
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-4 w-4" />
                                                คัดลอก
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground" htmlFor="topup-amount">
                                จำนวนเงินที่โอน
                            </label>
                            <Input
                                id="topup-amount"
                                inputMode="decimal"
                                placeholder="เช่น 300 หรือ 1000"
                                value={topupAmount}
                                onChange={(e) => setTopupAmount(e.target.value.replace(/[^\d.]/g, ""))}
                            />
                            <p className="text-xs text-muted-foreground">
                                กรอกยอดที่โอนจริงเพื่อใช้ยืนยันรายการ และรองรับกรณีที่ระบบตรวจสลิปอัตโนมัติยังไม่ได้เปิดใช้งาน
                            </p>
                            {hasValidAmount && (
                                <p className="text-sm font-medium text-primary">
                                    ยอดที่ส่งตรวจ: ฿{formatCurrency(topupAmount)}
                                </p>
                            )}
                        </div>

                        <div className="space-y-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={ACCEPTED_TYPES.join(",")}
                                onChange={handleFileInputChange}
                                className="hidden"
                                id="slip-upload"
                            />

                            {slipPreview ? (
                                <div className="relative rounded-2xl border border-border p-2">
                                    <button
                                        type="button"
                                        onClick={removeSlip}
                                        className="absolute right-0 top-0 z-10 -translate-y-1/2 translate-x-1/2 rounded-full bg-red-500 p-1 text-white transition-colors hover:bg-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={slipPreview}
                                        alt="สลิปการโอนเงิน"
                                        className="max-h-72 w-full rounded-xl object-contain"
                                    />
                                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                        <span className="truncate">{slipFile?.name}</span>
                                        <span>{slipFile ? `${(slipFile.size / 1024 / 1024).toFixed(2)} MB` : ""}</span>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            fileInputRef.current?.click();
                                        }
                                    }}
                                    className={[
                                        "w-full cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200",
                                        isDragging
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/50 hover:bg-muted/50",
                                    ].join(" ")}
                                >
                                    <ImagePlus className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                                    <p className="font-medium text-muted-foreground">ลากและวางสลิปเพื่ออัปโหลด</p>
                                    <p className="mt-1 text-sm text-muted-foreground">หรือ</p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="mt-2 rounded-full"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            fileInputRef.current?.click();
                                        }}
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        อัปโหลดไฟล์
                                    </Button>
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        รองรับ JPG, PNG, WebP สูงสุด 5MB
                                    </p>
                                </div>
                            )}

                            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                    <div className="space-y-1">
                                        <p>กรุณาโอนผ่านแอปธนาคารเท่านั้น ระบบไม่รองรับการโอนด้วยตู้ ATM</p>
                                        <p className="text-xs text-amber-600 dark:text-amber-500">
                                            เมื่อเปิดเชื่อม API ตรวจสลิปแล้ว ระบบจะใช้รูปนี้ตรวจสอบยอดและข้อมูลการโอนให้อัตโนมัติ
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleSubmit}
                                className="w-full gap-2 rounded-xl bg-primary hover:bg-primary/90"
                                size="lg"
                                disabled={!canSubmit}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        กำลังส่งข้อมูล...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4" />
                                        ส่งหลักฐานการโอน
                                    </>
                                )}
                            </Button>

                            {!canSubmit && (
                                <p className="text-center text-xs text-muted-foreground">
                                    กรุณากรอกจำนวนเงินและอัปโหลดสลิปก่อนส่งรายการ
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
