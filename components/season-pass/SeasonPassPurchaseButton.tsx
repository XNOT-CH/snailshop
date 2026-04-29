"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { showError, showPurchaseConfirm, showPurchaseSuccessModal, showWarning } from "@/lib/swal";

type SeasonPassPurchaseButtonProps = {
    planName: string;
    price: number;
    creditBalance: number;
    disabled?: boolean;
    buttonText?: string;
};

type SeasonPassLinkButtonProps = {
    href: string;
    children: ReactNode;
};

export const seasonPassButtonShellClass =
    "group relative h-[58px] w-fit overflow-hidden rounded-full border border-[#d7b96f] bg-transparent px-[5px] py-[5px] text-sm font-semibold text-white shadow-[0_18px_36px_-22px_rgba(15,23,42,0.42)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_44px_-22px_rgba(37,99,235,0.4)] disabled:border-slate-200 disabled:bg-transparent disabled:text-slate-400 disabled:shadow-none";

export const seasonPassButtonTextClass =
    "relative z-10 flex h-full items-center justify-center gap-2 px-7 pt-[4px] text-center text-[15px] font-semibold tracking-[0.01em] text-white drop-shadow-[0_2px_8px_rgba(15,23,42,0.25)]";

function SeasonPassButtonFrame() {
    return (
        <>
            <span className="absolute inset-0 rounded-full bg-[linear-gradient(180deg,#f7e7a7_0%,#c99634_45%,#f4de97_100%)] opacity-95 transition-opacity duration-300 group-hover:opacity-100 group-disabled:opacity-100" />
            <span className="absolute inset-[4px] rounded-full bg-[linear-gradient(180deg,#fff8d7_0%,#ddb96a_22%,#b77d1f_100%)]" />
            <span className="absolute inset-[8px] rounded-full bg-[linear-gradient(180deg,#487cf1_0%,#2a57cf_46%,#1a3faa_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-8px_16px_rgba(10,29,93,0.24)]" />
            <span className="absolute inset-x-[18px] top-[10px] h-4.5 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0))] blur-[1px]" />
        </>
    );
}

export function SeasonPassLinkButton({ href, children }: Readonly<SeasonPassLinkButtonProps>) {
    return (
        <Button asChild className={seasonPassButtonShellClass}>
            <Link
                href={href}
                className="relative inline-flex h-full items-center justify-center overflow-hidden rounded-full"
            >
                <SeasonPassButtonFrame />
                <span className={seasonPassButtonTextClass}>{children}</span>
            </Link>
        </Button>
    );
}

export function SeasonPassPurchaseButton({
    planName,
    price,
    creditBalance,
    disabled = false,
    buttonText = "ซื้อ Season Pass",
}: Readonly<SeasonPassPurchaseButtonProps>) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const hasEnoughBalance = creditBalance >= price;

    const handlePurchase = async () => {
        if (disabled || isLoading) {
            return;
        }

        if (!hasEnoughBalance) {
            showWarning("เครดิตคงเหลือไม่เพียงพอสำหรับซื้อ Season Pass");
            return;
        }

        const confirmed = await showPurchaseConfirm({
            productName: planName,
            priceText: `฿${price.toLocaleString()}`,
            extraHtml: `เครดิตคงเหลือ ฿${creditBalance.toLocaleString()}`,
            confirmText: buttonText,
        });

        if (!confirmed) {
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetchWithCsrf("/api/season-pass/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                showError(data.message || "ไม่สามารถซื้อ Season Pass ได้");
                return;
            }

            await showPurchaseSuccessModal({
                title: data.queued ? "ต่ออายุ Season Pass สำเร็จ" : "ซื้อ Season Pass สำเร็จ",
                html: `
                    <div class="space-y-3 text-left">
                        <p><strong>${planName}</strong> ${data.queued ? "ถูกเพิ่มเข้าคิวรอบถัดไปแล้ว" : "ถูกเปิดใช้งานแล้ว"}</p>
                        ${data.startsAtText ? `<p>รอบถัดไปจะเริ่ม <strong>${data.startsAtText}</strong></p>` : ""}
                        <p>สิทธิ์ทั้งหมดจะสิ้นสุด <strong>${data.endAtText}</strong></p>
                    </div>
                `,
                confirmText: "ไปหน้ารับของ",
            });

            router.push("/dashboard/season-pass");
            router.refresh();
        } catch (error) {
            console.error("[SEASON_PASS_PURCHASE]", error);
            showError("เกิดข้อผิดพลาดในการซื้อ Season Pass");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            type="button"
            onClick={() => void handlePurchase()}
            disabled={disabled || isLoading || !hasEnoughBalance}
            className={seasonPassButtonShellClass}
        >
            <SeasonPassButtonFrame />
            <span className={seasonPassButtonTextClass}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isLoading ? "กำลังดำเนินการ" : buttonText}
            </span>
        </Button>
    );
}
