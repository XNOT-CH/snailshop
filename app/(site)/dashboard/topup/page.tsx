
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { showError, showSuccess, showWarning } from "@/lib/swal";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { requirePinForAction } from "@/lib/require-pin-for-action";
import { formatLocalizedAmount as formatCurrency } from "@/lib/formatters/currency";
import {
    AlertTriangle,
    Building2,
    Check,
    CheckCircle,
    Copy,
    CreditCard,
    Gift,
    ImagePlus,
    Link2,
    Loader2,
    QrCode,
    ShieldCheck,
    TicketPercent,
    Upload,
    User,
    Wallet,
    ArrowRight,
    X,
} from "lucide-react";
import { useMaintenanceStatus } from "@/hooks/useMaintenanceStatus";

type VerifyTarget = "bank" | "truewallet";
type VerifyMethod = "image" | "payload" | "base64" | "url";
type PaymentChannel = "truewallet-app" | "bank-slip" | "voucher";

const BANK_INFO = {
    bankName: "ธนาคารกสิกรไทย",
    accountName: "วีรวุฒิ นิติทอนกุล",
    accountNumber: "1448826011",
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_BYTES = 4 * 1024 * 1024;

const PAYMENT_CHANNELS: Array<{
    value: PaymentChannel;
    title: string;
    subtitle: string;
    fee: string;
    badgeTone: "red" | "green" | "violet";
    icon: typeof Wallet;
    description: string;
    imageSrc?: string;
    imageAlt?: string;
}> = [
    {
        value: "truewallet-app",
        title: "ซองของขวัญ",
        subtitle: "ทรูมันนี่ วอลเล็ท",
        fee: "ค่าธรรมเนียม 2.9% สูงสุด 20฿",
        badgeTone: "red",
        icon: Gift,
        description: "เติมเงินผ่านลิงก์ซองของขวัญจากทรูมันนี่ วอลเล็ท",
        imageSrc: "/TU1.png",
        imageAlt: "TrueMoney Wallet",
    },
    {
        value: "bank-slip",
        title: "ยืนยันสลิป",
        subtitle: "ธนาคาร",
        fee: "ไม่มีค่าธรรมเนียม 0%",
        badgeTone: "green",
        icon: CheckCircle,
        description: "แนบสลิปธนาคารและตรวจสอบอัตโนมัติ",
        imageSrc: "/type-img-04.png",
        imageAlt: "Bank slip verification",
    },
    {
        value: "voucher",
        title: "โค้ด",
        subtitle: "รหัสเติมเงิน",
        fee: "พิเศษ",
        badgeTone: "violet",
        icon: TicketPercent,
        description: "สำหรับโค้ดส่วนลดหรือบัตรเติมเงินในอนาคต",
        imageSrc: "/voucher-ticket-new-card.webp",
        imageAlt: "Voucher code",
    },
];

function getVerifyMethodLabel(verifyMethod: VerifyMethod) {
    if (verifyMethod === "image") {
        return "รูปภาพ";
    }

    if (verifyMethod === "payload") {
        return "คิวอาร์เพย์โหลด";
    }

    if (verifyMethod === "base64") {
        return "Base64";
    }

    return "ลิงก์รูปภาพ";
}

function getVerifyTargetLabel(verifyTarget: VerifyTarget) {
    return verifyTarget === "truewallet" ? "ทรูมันนี่ วอลเล็ท" : "ธนาคาร";
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
    const [verifyTarget, setVerifyTarget] = useState<VerifyTarget>("bank");
    const [verifyMethod, setVerifyMethod] = useState<VerifyMethod>("image");
    const [selectedChannel, setSelectedChannel] = useState<PaymentChannel | null>(null);
    const [qrPayload, setQrPayload] = useState("");
    const [base64Value, setBase64Value] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [remark, setRemark] = useState("");
    const [giftLink, setGiftLink] = useState("");
    const [voucherCode, setVoucherCode] = useState("");
    const [isRedeemingVoucher, setIsRedeemingVoucher] = useState(false);
    const [isClient, setIsClient] = useState(false);

    const isGiftChannel = selectedChannel === "truewallet-app";
    const isBankSlipChannel = selectedChannel === "bank-slip";
    const isVoucherChannel = selectedChannel === "voucher";
    const selectedChannelConfig = PAYMENT_CHANNELS.find((channel) => channel.value === selectedChannel) ?? null;

    const hasValidAmount = useMemo(() => {
        const amount = Number(topupAmount);
        return Number.isFinite(amount) && amount > 0;
    }, [topupAmount]);

    const hasVerificationInput = useMemo(() => {
        switch (verifyMethod) {
            case "image":
                return Boolean(slipFile);
            case "payload":
                return qrPayload.trim().length > 0;
            case "base64":
                return base64Value.trim().length > 0;
            case "url":
                return imageUrl.trim().length > 0;
            default:
                return false;
        }
    }, [base64Value, imageUrl, qrPayload, slipFile, verifyMethod]);

    const canSubmit = hasVerificationInput && hasValidAmount && !isSubmitting && !maintenance?.enabled;

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!selectedChannel) {
            document.body.style.overflow = "";
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [selectedChannel]);

    const methodOptions = useMemo(() => {
        const options: Array<{
            value: VerifyMethod;
            title: string;
            description: string;
            icon: typeof Upload;
        }> = [
            {
                value: "image",
                title: "อัปโหลดรูป",
                description: "ส่งไฟล์สลิปโดยตรง",
                icon: Upload,
            },
            {
                value: "base64",
                title: "Base64",
                description: "วาง Base64 ของรูปสลิป",
                icon: ImagePlus,
            },
            {
                value: "url",
                title: "URL",
                description: "ใช้ลิงก์รูปภาพสาธารณะ",
                icon: Link2,
            },
        ];

        if (verifyTarget === "bank") {
            options.splice(1, 0, {
                value: "payload",
                title: "Payload",
                description: "วาง QR payload ของสลิป",
                icon: QrCode,
            });
        }

        return options;
    }, [verifyTarget]);

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
            showError("กรุณาอัปโหลดไฟล์ JPG, PNG, WebP หรือ GIF เท่านั้น");
            return;
        }

        if (file.size > MAX_FILE_BYTES) {
            showError("ขนาดไฟล์ต้องไม่เกิน 4MB");
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

    const handleSelectChannel = (channel: PaymentChannel) => {
        setSelectedChannel(channel);

        if (channel === "truewallet-app") {
            setVerifyTarget("truewallet");
            if (verifyMethod === "payload") {
                setVerifyMethod("image");
            }
            return;
        }

        setVerifyTarget("bank");
    };

    const handleSubmit = async () => {
        if (maintenance?.enabled) {
            showWarning(maintenance.message);
            return;
        }

        if (!hasValidAmount) {
            showWarning("กรุณากรอกจำนวนเงินที่โอนให้ถูกต้อง");
            return;
        }

        if (!hasVerificationInput) {
            showWarning("กรุณากรอกข้อมูลสลิปตามวิธีที่เลือกก่อนส่งรายการ");
            return;
        }

        const pinCheck = await requirePinForAction("ยืนยัน PIN เพื่อส่งสลิปเติมเงิน");
        if (!pinCheck.allowed) {
            return;
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append("amount", topupAmount);
            formData.append("verifyType", verifyTarget);
            formData.append("provider", verifyTarget);
            if (pinCheck.pin) {
                formData.append("pin", pinCheck.pin);
            }

            if (remark.trim()) {
                formData.append("remark", remark.trim());
            }

            if (verifyMethod === "image") {
                if (!slipFile) {
                    showWarning("กรุณาอัปโหลดรูปสลิปก่อนส่งรายการ");
                    return;
                }
                formData.append("image", slipFile);
            }

            if (verifyMethod === "payload") {
                formData.append("payload", qrPayload.trim());
            }

            if (verifyMethod === "base64") {
                formData.append("base64", base64Value.trim());
            }

            if (verifyMethod === "url") {
                formData.append("url", imageUrl.trim());
            }

            const response = await fetchWithCsrf("/api/topup", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showSuccess(data.message);
                removeSlip();
                setTopupAmount("");
                setQrPayload("");
                setBase64Value("");
                setImageUrl("");
                setRemark("");
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

    const handleGiftRedeem = () => {
        if (!giftLink.trim()) {
            showWarning("กรุณาวางลิงก์ซองอั่งเปาก่อน");
            return;
        }

        showWarning("ตอนนี้ผมทำหน้า UI ซองอั่งเปาให้แล้ว แต่ยังไม่ได้เชื่อม backend รับลิงก์ซองอั่งเปา");
    };

    const handleVoucherRedeem = async () => {
        if (!voucherCode.trim()) {
            showWarning("กรุณากรอกโค้ดก่อนเติมโค้ด");
            return;
        }

        const pinCheck = await requirePinForAction("ยืนยัน PIN เพื่อเติมโค้ด");
        if (!pinCheck.allowed) {
            return;
        }

        setIsRedeemingVoucher(true);

        try {
            const response = await fetchWithCsrf("/api/promo-codes/redeem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: voucherCode, pin: pinCheck.pin || undefined }),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                showWarning(data.message || "ไม่สามารถเติมโค้ดได้");
                return;
            }

            showSuccess(data.message || "เติมเครดิตสำเร็จ");
            setVoucherCode("");
            setSelectedChannel(null);
            router.refresh();
        } catch (error) {
            console.error("[VOUCHER_REDEEM]", error);
            showError("เกิดข้อผิดพลาดในการเติมโค้ด");
        } finally {
            setIsRedeemingVoucher(false);
        }
    };

    // Shared look for the three channel dialogs, after the home page's cards and fields.
    const dialogCardClass = "mx-auto w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.45)] sm:p-5";
    const fieldClass = "h-11 w-full min-w-0 rounded-xl border-border bg-muted/40 px-3 text-sm";
    const primaryActionClass = "mt-4 h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors duration-300 ease-out hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60";

    const renderDialogHeader = (Icon: typeof Wallet, title: string, subtitle: string) => (
        <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-lg font-bold text-[var(--page-heading)]">{title}</p>
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                </div>
            </div>
            <button
                type="button"
                onClick={() => setSelectedChannel(null)}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="ปิด"
            >
                <X className="h-5 w-5" />
            </button>
        </div>
    );

    return (
        <div className="dashboard-topup-page space-y-6">
            <PageBreadcrumb
                items={[
                    { label: "แดชบอร์ด", href: "/dashboard" },
                    { label: "เติมเงิน" },
                ]}
            />

            <div>
                <h1 className="text-3xl font-bold leading-tight text-[var(--page-heading)] sm:text-4xl">เติมเงิน</h1>
                <p className="mt-2 text-muted-foreground">
                    เลือกช่องทางที่ต้องการ แล้วดำเนินการชำระเงินตามรูปแบบของแต่ละวิธีได้ทันที
                </p>
            </div>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-[var(--page-heading)]">ช่องทางการชำระเงิน</h2>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {PAYMENT_CHANNELS.map((channel) => {
                        const Icon = channel.icon;
                        const active = selectedChannel === channel.value;

                        return (
                            <button
                                key={channel.value}
                                type="button"
                                onClick={() => handleSelectChannel(channel.value)}
                                className={[
                                    "group flex flex-col rounded-2xl border bg-card p-5 text-left transition-[border-color,translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 sm:p-6",
                                    active ? "border-primary" : "border-border hover:border-primary/50",
                                ].join(" ")}
                            >
                                <div className="flex h-20 items-center justify-center rounded-xl bg-muted/40">
                                    {channel.imageSrc ? (
                                        <Image
                                            src={channel.imageSrc}
                                            alt={channel.imageAlt ?? channel.title}
                                            width={160}
                                            height={96}
                                            className="h-14 w-auto max-w-[8rem] object-contain"
                                        />
                                    ) : (
                                        <Icon className="h-9 w-9 text-primary" />
                                    )}
                                </div>
                                <p className="mt-5 text-lg font-bold text-foreground">{channel.title}</p>
                                <p className="text-sm text-muted-foreground">{channel.subtitle}</p>
                                <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{channel.description}</p>
                                <span className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary/10 text-sm font-semibold text-primary transition-colors duration-300 ease-out group-hover:bg-primary group-hover:text-primary-foreground">
                                    เลือกช่องทางนี้
                                    <ArrowRight className="h-4 w-4" />
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {selectedChannel && isClient
                ? createPortal(
            <div className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-[2px]">
                <div
                    className="absolute inset-0"
                    onClick={() => setSelectedChannel(null)}
                    aria-hidden="true"
                />
                <div className="relative flex min-h-dvh w-full items-center justify-center p-2 sm:p-4">
                <Card className="relative z-10 my-auto min-w-0 w-[min(calc(100vw-1rem),24rem)] max-w-[24rem] border-0 bg-transparent shadow-none sm:w-full sm:max-w-[28rem]">
                    <CardContent className="space-y-3 overflow-x-hidden overflow-y-auto p-0 max-h-[calc(100dvh-1rem)] overscroll-contain sm:max-h-[calc(100svh-1.5rem)]">
                        {maintenance?.enabled && (
                            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                                <p className="font-semibold">ระบบเติมเงินกำลังปิดปรับปรุงชั่วคราว</p>
                                <p className="mt-1 text-xs opacity-90">{maintenance.message}</p>
                            </div>
                        )}

                        {isGiftChannel ? (
                            <div className={dialogCardClass}>
                                {renderDialogHeader(Gift, "ซองอั่งเปา", "True Money Wallet")}

                                <div className="mt-4 flex justify-center rounded-xl bg-muted/40 p-3">
                                    <Image
                                        src="/TU1.png"
                                        alt="ตัวอย่างซองอั่งเปา TrueMoney"
                                        width={560}
                                        height={260}
                                        className="h-24 w-auto object-contain sm:h-28"
                                    />
                                </div>

                                <div className="mt-4 space-y-2">
                                    <label className="text-sm font-semibold text-foreground" htmlFor="gift-link-input">ลิงก์ซองอั่งเปา</label>
                                    <Input
                                        id="gift-link-input"
                                        value={giftLink}
                                        onChange={(e) => setGiftLink(e.target.value)}
                                        placeholder="https://gift.truemoney.com/campaign/?v=xxxxxxxxxx"
                                        className={fieldClass}
                                    />
                                </div>

                                <Button type="button" onClick={handleGiftRedeem} className={primaryActionClass}>
                                    <Gift className="mr-2 h-4 w-4" />
                                    เติมเงิน
                                </Button>
                            </div>
                        ) : isVoucherChannel ? (
                            <div className={dialogCardClass}>
                                {renderDialogHeader(TicketPercent, "โค้ด", "Code")}

                                <div className="mt-4 flex flex-col items-center gap-3 rounded-xl bg-muted/40 p-4">
                                    <Image
                                        src="/voucher-ticket-new-card.webp"
                                        alt="Voucher ticket"
                                        width={260}
                                        height={220}
                                        className="h-20 w-auto object-contain sm:h-24"
                                    />
                                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                        พิเศษ
                                    </span>
                                </div>

                                <p className="mt-4 text-center text-sm font-semibold text-red-600 dark:text-red-400">
                                    แต่ละโค้ดสามารถใช้งานได้หนึ่งครั้งต่อหนึ่งบัญชี!
                                </p>

                                <div className="mt-4 space-y-2">
                                    <label className="text-sm font-semibold text-foreground" htmlFor="voucher-code-input">โค้ด</label>
                                    <Input
                                        id="voucher-code-input"
                                        value={voucherCode}
                                        onChange={(e) => setVoucherCode(e.target.value)}
                                        placeholder="กรอกโค้ดที่นี่"
                                        className={fieldClass}
                                    />
                                </div>

                                <Button
                                    type="button"
                                    onClick={handleVoucherRedeem}
                                    disabled={isRedeemingVoucher}
                                    className={primaryActionClass}
                                >
                                    {isRedeemingVoucher ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            กำลังเติมโค้ด...
                                        </>
                                    ) : (
                                        <>
                                            <Gift className="mr-2 h-4 w-4" />
                                            เติมโค้ด
                                        </>
                                    )}
                                </Button>
                            </div>
                        ) : isBankSlipChannel ? (
                            <div className={dialogCardClass}>
                                {renderDialogHeader(Wallet, "แนบสลิป", "Mobile Banking")}

                                <div className="mt-4 space-y-3 rounded-xl bg-muted/40 p-4">
                                    <div className="flex justify-center">
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            ไม่มีค่าธรรมเนียม 0%
                                        </span>
                                    </div>
                                    <div className="grid gap-3 text-center sm:grid-cols-2">
                                        <div>
                                            <p className="text-xs text-muted-foreground">ชื่อบัญชี</p>
                                            <p className="mt-1 text-sm font-semibold text-foreground">{BANK_INFO.accountName}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">ธนาคาร</p>
                                            <p className="mt-1 text-sm font-semibold text-foreground">{BANK_INFO.bankName}</p>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-muted-foreground">เลขบัญชี</p>
                                        <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
                                            <span className="break-all text-2xl font-bold tracking-wide text-[var(--page-heading)]">
                                                {BANK_INFO.accountNumber.replaceAll("-", "")}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(BANK_INFO.accountNumber.replaceAll("-", ""))}
                                                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                                                aria-label="คัดลอกเลขบัญชี"
                                            >
                                                {copied ? <Check className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept={ACCEPTED_TYPES.join(",")}
                                        onChange={handleFileInputChange}
                                        className="hidden"
                                        id="bank-slip-upload"
                                    />

                                    {slipPreview ? (
                                        <div className="relative rounded-xl border border-border p-2">
                                            <button
                                                type="button"
                                                onClick={removeSlip}
                                                className="absolute right-0 top-0 z-10 -translate-y-1/2 translate-x-1/2 rounded-full bg-red-500 p-1 text-white transition-colors hover:bg-red-600"
                                                aria-label="ลบสลิป"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={slipPreview}
                                                alt="สลิปการโอนเงิน"
                                                className="max-h-40 w-full rounded-lg object-contain sm:max-h-56"
                                            />
                                            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                                <span className="truncate">{slipFile?.name}</span>
                                                <span>{slipFile ? `${(slipFile.size / 1024 / 1024).toFixed(2)} MB` : ""}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
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
                                                "w-full rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors duration-300 ease-out",
                                                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-primary/5",
                                            ].join(" ")}
                                        >
                                            <Upload className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
                                            <p className="font-semibold text-foreground">ลาก & วาง เพื่ออัปโหลด</p>
                                            <p className="mt-1 text-xs text-muted-foreground">หรือ</p>
                                            <span className="mt-2 inline-flex rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                                                อัปโหลดไฟล์
                                            </span>
                                        </button>
                                    )}
                                </div>

                                <div className="mt-4 space-y-2">
                                    <label className="text-sm font-semibold text-foreground" htmlFor="bank-topup-amount">
                                        จำนวนเงินที่โอน
                                    </label>
                                    <Input
                                        id="bank-topup-amount"
                                        inputMode="decimal"
                                        placeholder="เช่น 300 หรือ 1000"
                                        value={topupAmount}
                                        onChange={(e) => setTopupAmount(e.target.value.replaceAll(/[^\d.]/g, ""))}
                                        className={fieldClass}
                                    />
                                    {hasValidAmount && (
                                        <p className="text-xs font-semibold text-primary">
                                            ยอดที่ส่งตรวจ: ฿{formatCurrency(topupAmount)}
                                        </p>
                                    )}
                                </div>

                                <p className="mt-3 text-center text-xs font-semibold leading-snug text-red-600 dark:text-red-400 sm:text-sm">
                                    กรุณาโอนผ่านแอปธนาคารเท่านั้น ระบบไม่รองรับการโอนด้วยการยืนยันนี้
                                </p>

                                <Button onClick={handleSubmit} className={primaryActionClass} disabled={!canSubmit}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            กำลังส่งข้อมูล...
                                        </>
                                    ) : (
                                        <>
                                            <Wallet className="mr-2 h-4 w-4" />
                                            เติมเงิน
                                        </>
                                    )}
                                </Button>
                            </div>
                        ) : (
                        <>
                        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-emerald-700">ช่องทางที่เลือกพร้อมใช้งาน</p>
                                        <p className="text-xs text-slate-500">
                                            ระบบจะส่งข้อมูลไปตรวจตามช่องทางและวิธีที่คุณเลือกอัตโนมัติ
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 rounded-2xl border border-white bg-white p-5 shadow-sm">
                                    <div className="grid gap-4 text-center sm:grid-cols-2">
                                        <div>
                                            <div className="mb-1 flex items-center justify-center gap-1 text-xs text-slate-400">
                                                <User className="h-3 w-3" />
                                                ชื่อบัญชี
                                            </div>
                                            <p className="font-bold text-slate-900">{BANK_INFO.accountName}</p>
                                        </div>
                                        <div>
                                            <div className="mb-1 flex items-center justify-center gap-1 text-xs text-slate-400">
                                                <Building2 className="h-3 w-3" />
                                                ธนาคาร
                                            </div>
                                            <p className="font-bold text-slate-900">{BANK_INFO.bankName}</p>
                                        </div>
                                    </div>

                                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center">
                                        <div className="mb-1 flex items-center justify-center gap-1 text-xs text-slate-400">
                                            <CreditCard className="h-3 w-3" />
                                            เลขบัญชี
                                        </div>
                                        <div className="flex flex-wrap items-center justify-center gap-2">
                                            <span className="break-all text-xl font-black tracking-[0.06em] text-blue-600 sm:text-2xl sm:tracking-[0.12em]">
                                                {BANK_INFO.accountNumber}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-9 rounded-full px-4"
                                                onClick={() => copyToClipboard(BANK_INFO.accountNumber.replaceAll("-", ""))}
                                            >
                                                {copied ? (
                                                    <>
                                                        <Check className="mr-2 h-4 w-4 text-emerald-500" />
                                                        คัดลอกแล้ว
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="mr-2 h-4 w-4" />
                                                        คัดลอก
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#faf5ff_0%,#ffffff_45%,#fff7ed_100%)] p-5">
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">
                                    วิธีตรวจสลิป
                                </p>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {methodOptions.map((option) => {
                                        const Icon = option.icon;
                                        const active = verifyMethod === option.value;

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setVerifyMethod(option.value)}
                                                className={[
                                                    "rounded-2xl border p-4 text-left transition",
                                                    active
                                                        ? "border-blue-400 bg-white shadow-sm"
                                                        : "border-white/70 bg-white/70 hover:border-blue-200",
                                                ].join(" ")}
                                            >
                                                <Icon className="h-5 w-5 text-blue-700" />
                                                <p className="mt-3 font-bold text-slate-900">{option.title}</p>
                                                <p className="mt-1 text-xs text-slate-500">{option.description}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                                {verifyTarget === "truewallet" && (
                                    <p className="mt-3 text-xs text-slate-500">
                                        ทรูมันนี่ วอลเล็ทรองรับเฉพาะรูปภาพ, Base64 และลิงก์รูปภาพ
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-900" htmlFor="topup-amount">
                                        จำนวนเงินที่โอน
                                    </label>
                                    <Input
                                        id="topup-amount"
                                        inputMode="decimal"
                                        placeholder="เช่น 300 หรือ 1000"
                                        value={topupAmount}
                                        onChange={(e) => setTopupAmount(e.target.value.replace(/[^\d.]/g, ""))}
                                    />
                                    <p className="text-xs text-slate-500">
                                        กรอกยอดที่โอนจริงเพื่อใช้เทียบกับข้อมูลในสลิป
                                    </p>
                                    {hasValidAmount && (
                                        <p className="text-sm font-semibold text-blue-600">
                                            ยอดที่ส่งตรวจ: ฿{formatCurrency(topupAmount)}
                                        </p>
                                    )}
                                </div>

                                {verifyMethod === "image" && (
                                    <div className="space-y-3">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept={ACCEPTED_TYPES.join(",")}
                                            onChange={handleFileInputChange}
                                            className="hidden"
                                            id="slip-upload"
                                        />

                                        {slipPreview ? (
                                            <div className="relative rounded-3xl border border-slate-200 p-2">
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
                                                    className="max-h-80 w-full rounded-2xl object-contain"
                                                />
                                                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                                                    <span className="truncate">{slipFile?.name}</span>
                                                    <span>{slipFile ? `${(slipFile.size / 1024 / 1024).toFixed(2)} MB` : ""}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
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
                                                    "w-full rounded-3xl border-2 border-dashed p-5 text-center transition-all duration-200 sm:p-8",
                                                    isDragging
                                                        ? "border-blue-500 bg-blue-50"
                                                        : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50",
                                                ].join(" ")}
                                            >
                                                <ImagePlus className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                                                <p className="font-semibold text-slate-700">ลากและวางสลิปเพื่ออัปโหลด</p>
                                                <p className="mt-1 text-xs text-slate-500 sm:text-sm">หรือ</p>
                                                <span className="mt-3 inline-flex rounded-full border border-input bg-background px-3 py-2 text-sm shadow-sm">
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    อัปโหลดไฟล์
                                                </span>
                                                <p className="mt-3 text-xs text-slate-400">
                                                    รองรับ JPG, PNG, WebP, GIF สูงสุด 4MB
                                                </p>
                                            </button>
                                        )}
                                    </div>
                                )}

                                {verifyMethod === "payload" && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-900" htmlFor="qr-payload-input">คิวอาร์เพย์โหลด</label>
                                        <Input
                                            id="qr-payload-input"
                                            value={qrPayload}
                                            onChange={(e) => setQrPayload(e.target.value)}
                                            placeholder="วางคิวอาร์เพย์โหลดของสลิปที่นี่"
                                        />
                                        <p className="text-xs text-slate-500">
                                            เหมาะกับการตรวจสลิปธนาคารเมื่อคุณมีคิวอาร์เพย์โหลดอยู่แล้ว
                                        </p>
                                    </div>
                                )}

                                {verifyMethod === "base64" && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-900" htmlFor="base64-input">Base64</label>
                                        <textarea
                                            id="base64-input"
                                            value={base64Value}
                                            onChange={(e) => setBase64Value(e.target.value)}
                                            placeholder="วาง Base64 ของรูปสลิปที่นี่"
                                            className="min-h-40 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        />
                                        <p className="text-xs text-slate-500">
                                            รองรับทั้งแบบมีและไม่มี data URI prefix
                                        </p>
                                    </div>
                                )}
                                {verifyMethod === "url" && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-900" htmlFor="image-url-input">ลิงก์รูปภาพ</label>
                                        <Input
                                            id="image-url-input"
                                            value={imageUrl}
                                            onChange={(e) => setImageUrl(e.target.value)}
                                            placeholder="https://example.com/slips/slip-123.jpg"
                                        />
                                        <p className="text-xs text-slate-500">
                                            ลิงก์ต้องเป็น HTTP/HTTPS และเข้าถึงได้จากภายนอกเท่านั้น
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-900" htmlFor="topup-remark">
                                        หมายเหตุอ้างอิง
                                    </label>
                                    <Input
                                        id="topup-remark"
                                        value={remark}
                                        maxLength={255}
                                        onChange={(e) => setRemark(e.target.value)}
                                        placeholder="เช่น รายการ #12345"
                                    />
                                    <p className="text-xs text-slate-500">
                                        ส่งหมายเหตุไปพร้อมคำขอตรวจ เพื่อช่วยติดตามรายการย้อนหลัง
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                        <div className="space-y-1">
                                            <p className="font-semibold">คำแนะนำก่อนส่งรายการ</p>
                                            <p className="text-xs text-amber-700">
                                                กรุณาโอนผ่านแอปธนาคารหรือวอลเล็ทเท่านั้น ระบบไม่รองรับการโอนผ่านตู้ ATM
                                            </p>
                                            <p className="text-xs text-amber-700">
                                                เลือกวิธีตรวจให้ตรงกับข้อมูลที่คุณมี เพื่อให้ระบบตรวจสลิปได้แม่นที่สุด
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                                        ช่องทางที่เลือก
                                    </p>
                                    <p className="mt-3 text-2xl font-bold text-slate-900">
                                        {selectedChannelConfig?.title}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {selectedChannelConfig?.description}
                                    </p>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                                            ประเภท: {getVerifyTargetLabel(verifyTarget)}
                                        </span>
                                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                                            วิธีตรวจ: {getVerifyMethodLabel(verifyMethod)}
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSubmit}
                                    className="h-14 w-full rounded-2xl bg-blue-600 text-base font-bold hover:bg-blue-700"
                                    disabled={!canSubmit}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            กำลังส่งข้อมูล...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            ส่งหลักฐานการโอน
                                        </>
                                    )}
                                </Button>

                                {!canSubmit && (
                                    <p className="text-center text-xs text-slate-500">
                                        กรุณากรอกจำนวนเงินและข้อมูลสลิปให้ครบตามวิธีที่เลือกก่อนส่งรายการ
                                    </p>
                                )}
                            </div>
                        </div>
                        </>
                        )}
                    </CardContent>
                </Card>
                </div>
            </div>,
            document.body)
                : null}
        </div>
    );
}
