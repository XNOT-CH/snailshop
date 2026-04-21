
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
        imageSrc: "/voucher-ticket-new.png",
        imageAlt: "Voucher code",
    },
];

function formatCurrency(value: string) {
    const numeric = Number(value || 0);
    if (Number.isNaN(numeric)) return "0";
    return numeric.toLocaleString("th-TH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

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

    return (
        <div className="dashboard-topup-page rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(255,247,237,0.95),rgba(255,255,255,0.98)_42%,rgba(248,250,252,1)_100%)] px-4 py-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] sm:px-6 sm:py-8">
            <PageBreadcrumb
                items={[
                    { label: "แดชบอร์ด", href: "/dashboard" },
                    { label: "เติมเงิน" },
                ]}
                className="mb-6"
            />

            <div className="mb-8 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700 sm:text-sm sm:tracking-[0.32em]">
                    ช่องทางการชำระเงิน
                </p>
                <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">เติมเงิน</h1>
                <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                    เลือกช่องทางที่ต้องการ แล้วดำเนินการชำระเงินตามรูปแบบของแต่ละวิธีได้ทันที
                </p>
            </div>

            <div className="mx-auto grid w-full max-w-[1120px] gap-5 md:grid-cols-2">
                {PAYMENT_CHANNELS.map((channel) => {
                    const Icon = channel.icon;
                    const active = selectedChannel === channel.value;

                    return (
                        <button
                            key={channel.value}
                            type="button"
                            onClick={() => handleSelectChannel(channel.value)}
                            className={[
                                "group flex min-h-[240px] flex-col items-center justify-center rounded-[1.6rem] border bg-white px-5 py-6 text-center shadow-[0_18px_38px_rgba(15,23,42,0.05)] transition duration-200 sm:min-h-[290px] sm:px-6 sm:py-7",
                                active
                                    ? "border-blue-400 ring-2 ring-blue-100"
                                    : "border-slate-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_24px_48px_rgba(15,23,42,0.09)]",
                            ].join(" ")}
                        >
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-slate-50 to-slate-100 text-slate-700 sm:h-20 sm:w-20 sm:rounded-[1.5rem]">
                                {channel.imageSrc ? (
                                    <Image
                                        src={channel.imageSrc}
                                        alt={channel.imageAlt ?? channel.title}
                                        width={160}
                                        height={96}
                                        className="h-12 w-auto max-w-[7rem] object-contain sm:h-16 sm:max-w-[9rem]"
                                    />
                                ) : (
                                    <Icon className="h-8 w-8 sm:h-10 sm:w-10" />
                                )}
                            </div>
                            <p className="mt-4 text-lg font-extrabold text-slate-900 sm:mt-5 sm:text-xl">{channel.title}</p>
                            <p className="mt-1 text-base text-slate-500 sm:text-lg">{channel.subtitle}</p>
                            <p className="mt-4 text-xs text-slate-400">{channel.description}</p>
                        </button>
                    );
                })}
            </div>

            {selectedChannel && isClient
                ? createPortal(
            <div className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-[2px]">
                <div
                    className="absolute inset-0"
                    onClick={() => setSelectedChannel(null)}
                    aria-hidden="true"
                />
                <div className="relative flex min-h-dvh w-full items-center justify-center p-2 sm:p-4">
                <Card className="relative z-10 my-auto min-w-0 w-[min(calc(100vw-1rem),22rem)] max-w-[22rem] border-0 bg-transparent shadow-none sm:w-full sm:max-w-[26rem]">
                    <CardContent className="space-y-3 overflow-x-hidden overflow-y-auto p-0 max-h-[calc(100dvh-1rem)] overscroll-contain sm:max-h-[calc(100svh-1.5rem)]">
                        {maintenance?.enabled && (
                            <div className="rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                <p className="font-semibold">ระบบเติมเงินกำลังปิดปรับปรุงชั่วคราว</p>
                                <p className="mt-1 text-xs text-amber-800/90">{maintenance.message}</p>
                            </div>
                        )}

                        {isGiftChannel ? (
                            <div className="mx-auto w-full min-w-0 max-w-none overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:rounded-[1.5rem] sm:p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 sm:h-10 sm:w-10">
                                            <Gift className="h-4 w-4 text-slate-700 sm:h-5 sm:w-5" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-blue-700 sm:text-xl">ซองอั่งเปา</p>
                                            <p className="text-xs text-slate-500 sm:text-sm">True Money Wallet</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedChannel(null)}
                                        className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                        aria-label="ปิด"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="mt-3 rounded-[1rem] border-[3px] border-[#5b4a1e] bg-[linear-gradient(180deg,#fff8d8_0%,#d3c083_100%)] p-1.5 shadow-inner sm:mt-4 sm:rounded-[1.2rem] sm:p-2">
                                    <div className="rounded-[0.75rem] bg-[#8b7441]/15 p-1.5 sm:rounded-[0.9rem] sm:p-2">
                                        <div className="flex justify-center">
                                            <Image
                                                src="/TU1.png"
                                                alt="ตัวอย่างซองอั่งเปา TrueMoney"
                                                width={560}
                                                height={260}
                                                className="h-auto w-full max-w-[13rem] object-contain sm:max-w-[18rem]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 space-y-2 sm:mt-4">
                                    <label className="text-sm font-semibold text-slate-700" htmlFor="gift-link-input">ลิงก์ซองอั่งเปา</label>
                                    <Input
                                        id="gift-link-input"
                                        value={giftLink}
                                        onChange={(e) => setGiftLink(e.target.value)}
                                        placeholder="https://gift.truemoney.com/campaign/?v=xxxxxxxxxx"
                                        className="h-10 w-full min-w-0 rounded-xl border-violet-300 px-3 text-sm sm:h-11 sm:rounded-2xl"
                                    />
                                </div>

                                <Button
                                    type="button"
                                    onClick={handleGiftRedeem}
                                    className="mt-3 h-10 w-full rounded-xl bg-violet-100 text-sm font-bold text-violet-700 hover:bg-violet-200 sm:mt-4 sm:h-11 sm:rounded-2xl"
                                >
                                    <Gift className="mr-2 h-4 w-4" />
                                    เติมเงิน
                                </Button>
                            </div>
                        ) : isVoucherChannel ? (
                            <div className="mx-auto w-full min-w-0 max-w-none overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:max-w-md sm:rounded-[1.5rem] sm:p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 sm:h-10 sm:w-10">
                                            <TicketPercent className="h-4 w-4 text-slate-700 sm:h-5 sm:w-5" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-blue-700 sm:text-xl">โค้ด</p>
                                            <p className="text-xs text-slate-500 sm:text-sm">Code</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedChannel(null)}
                                        className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                        aria-label="ปิด"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="mt-3 flex justify-center sm:mt-5">
                                    <Image
                                        src="/voucher-ticket-new.png"
                                        alt="Voucher ticket"
                                        width={260}
                                        height={220}
                                        className="h-auto w-full max-w-[8rem] object-contain sm:max-w-[13rem]"
                                    />
                                </div>

                                <div className="mt-3 flex justify-center sm:mt-3">
                                    <span className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                                        พิเศษ
                                    </span>
                                </div>

                                <p className="mt-3 text-center text-xs font-bold text-rose-500 sm:mt-4 sm:text-base">
                                    แต่ละโค้ดสามารถใช้งานได้หนึ่งครั้งต่อหนึ่งบัญชี!
                                </p>

                                <div className="mt-3 space-y-2 sm:mt-5 sm:space-y-2">
                                    <label className="text-sm font-semibold text-slate-700" htmlFor="voucher-code-input">โค้ด</label>
                                    <Input
                                        id="voucher-code-input"
                                        value={voucherCode}
                                        onChange={(e) => setVoucherCode(e.target.value)}
                                        placeholder="กรอกโค้ดที่นี่"
                                        className="h-10 w-full min-w-0 rounded-xl border-violet-300 px-3 text-sm sm:h-12 sm:rounded-2xl sm:text-base"
                                    />
                                </div>

                                <Button
                                    type="button"
                                    onClick={handleVoucherRedeem}
                                    disabled={isRedeemingVoucher}
                                    className="mt-3 h-10 w-full rounded-xl bg-violet-100 text-sm font-bold text-violet-700 hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-70 sm:mt-4 sm:h-11 sm:rounded-2xl sm:text-sm"
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
                            <div className="mx-auto w-full min-w-0 max-w-none overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:max-w-[30rem] sm:rounded-[1.4rem] sm:p-3.5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 sm:h-9 sm:w-9">
                                            <Wallet className="h-4 w-4 text-slate-700 sm:h-4 sm:w-4" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-blue-700 sm:text-lg">แนบสลิป</p>
                                            <p className="text-xs text-slate-500 sm:text-sm">Mobile Banking</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedChannel(null)}
                                        className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                        aria-label="ปิด"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="mt-3 flex flex-col items-center justify-center gap-1 sm:mt-2.5">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                        <CheckCircle className="h-3 w-3" />
                                    </div>
                                    <p className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                                        ไม่มีค่าธรรมเนียม <span className="ml-1 rounded-full border border-emerald-400 px-2 py-0.5 text-xs">0%</span>
                                    </p>
                                </div>

                                <div className="mt-3 grid gap-2 text-center sm:mt-4 sm:grid-cols-2">
                                    <div>
                                        <p className="text-xs text-slate-400">ชื่อบัญชี</p>
                                        <p className="mt-1 text-[13px] font-black leading-tight text-blue-700 sm:mt-1.5 sm:text-[1.05rem]">
                                            {BANK_INFO.accountName}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">ธนาคาร</p>
                                        <p className="mt-1 text-[13px] font-black leading-tight text-blue-700 sm:mt-1.5 sm:text-[1.05rem]">
                                            {BANK_INFO.bankName}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 text-center sm:mt-3.5">
                                    <p className="text-xs text-slate-400">เลขบัญชี</p>
                                    <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
                                        <span className="break-all text-[0.9rem] font-black leading-none text-blue-700 sm:text-[2rem]">
                                            {BANK_INFO.accountNumber.replaceAll("-", "")}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(BANK_INFO.accountNumber.replaceAll("-", ""))}
                                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                            aria-label="คัดลอกเลขบัญชี"
                                        >
                                            {copied ? <Check className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-3 space-y-1.5 sm:mt-4">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept={ACCEPTED_TYPES.join(",")}
                                        onChange={handleFileInputChange}
                                        className="hidden"
                                        id="bank-slip-upload"
                                    />

                                    {slipPreview ? (
                                        <div className="relative rounded-[1.2rem] border border-slate-200 p-2">
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
                                                className="max-h-28 w-full rounded-[1rem] object-contain sm:max-h-56"
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
                                                "rounded-[0.95rem] border-2 border-dashed border-slate-400 px-3 py-3 text-center transition-all duration-200 sm:rounded-[1.2rem] sm:px-5 sm:py-5",
                                                isDragging ? "bg-slate-50" : "hover:bg-slate-50/80",
                                            ].join(" ")}
                                        >
                                            <Upload className="mx-auto mb-1 h-6 w-6 text-slate-500 sm:mb-2.5 sm:h-9 sm:w-9" />
                                            <p className="text-[0.82rem] font-black leading-tight text-slate-600 sm:text-[1.8rem] sm:leading-none">ลาก & วาง เพื่ออัปโหลด</p>
                                            <p className="mt-1 text-[10px] text-slate-500 sm:mt-2 sm:text-base">หรือ</p>
                                            <span className="mt-2 inline-flex rounded-lg bg-slate-600 px-4 py-1.5 text-xs font-bold text-white sm:mt-3 sm:rounded-xl sm:px-5 sm:py-3 sm:text-sm">
                                                อัปโหลดไฟล์
                                            </span>
                                        </button>
                                    )}
                                </div>

                                <div className="mt-2.5 space-y-1 sm:mt-4">
                                    <label className="text-sm font-medium text-slate-900" htmlFor="bank-topup-amount">
                                        จำนวนเงินที่โอน
                                    </label>
                                    <Input
                                        id="bank-topup-amount"
                                        inputMode="decimal"
                                        placeholder="เช่น 300 หรือ 1000"
                                        value={topupAmount}
                                        onChange={(e) => setTopupAmount(e.target.value.replaceAll(/[^\d.]/g, ""))}
                                        className="h-11 rounded-2xl"
                                    />
                                    {hasValidAmount && (
                                        <p className="text-xs font-semibold text-blue-600">
                                            ยอดที่ส่งตรวจ: ฿{formatCurrency(topupAmount)}
                                        </p>
                                    )}
                                </div>

                                <p className="mt-2 text-center text-[10px] font-bold leading-snug text-red-500 sm:text-sm">
                                    กรุณาโอนผ่านแอปธนาคารเท่านั้น ระบบไม่รองรับการโอนด้วยการยืนยันนี้
                                </p>

                                <Button
                                    onClick={handleSubmit}
                                    className="mt-2.5 h-8 w-full rounded-lg bg-blue-100 text-xs font-bold text-blue-700 hover:bg-blue-200 sm:h-10.5 sm:rounded-2xl sm:text-sm"
                                    disabled={!canSubmit}
                                >
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
                            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5">
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

                                <div className="mt-5 rounded-[1.4rem] border border-white bg-white p-5 shadow-sm">
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

                                    <div className="mt-5 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4 text-center">
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

                            <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#faf5ff_0%,#ffffff_45%,#fff7ed_100%)] p-5">
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
                                                    "rounded-[1.2rem] border p-4 text-left transition",
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
                                            <div className="relative rounded-[1.5rem] border border-slate-200 p-2">
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
                                                    className="max-h-80 w-full rounded-[1.2rem] object-contain"
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
                                                    "rounded-[1.6rem] border-2 border-dashed p-5 text-center transition-all duration-200 sm:p-8",
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
                                            className="min-h-40 w-full rounded-[1.2rem] border border-input bg-background px-4 py-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                                <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
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

                                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                                        ช่องทางที่เลือก
                                    </p>
                                    <p className="mt-3 text-2xl font-black text-slate-900">
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
                                    className="h-14 w-full rounded-[1.2rem] bg-blue-600 text-base font-bold hover:bg-blue-700"
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
