"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { escapeHtml } from "@/lib/sanitize";
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

// The site's single blue button, the same as the dashboard's Season Pass actions.
export const seasonPassButtonShellClass =
    "h-11 w-full rounded-xl px-6 text-sm font-semibold transition-colors duration-300 ease-out";

export function SeasonPassLinkButton({ href, children }: Readonly<SeasonPassLinkButtonProps>) {
    return (
        <Button asChild className={seasonPassButtonShellClass}>
            <Link href={href} prefetch={false}>
                {children}
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
                        <p><strong>${escapeHtml(planName)}</strong> ${data.queued ? "ถูกเพิ่มเข้าคิวรอบถัดไปแล้ว" : "ถูกเปิดใช้งานแล้ว"}</p>
                        ${data.startsAtText ? `<p>รอบถัดไปจะเริ่ม <strong>${escapeHtml(data.startsAtText)}</strong></p>` : ""}
                        <p>สิทธิ์ทั้งหมดจะสิ้นสุด <strong>${escapeHtml(data.endAtText)}</strong></p>
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
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? "กำลังดำเนินการ" : buttonText}
        </Button>
    );
}
