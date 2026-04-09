"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { showError, showSuccess, showWarning } from "@/lib/swal";

type SeasonPassClaimButtonProps = {
    canClaim: boolean;
    rewardLabel: string;
    rewardAmount: string;
    mockDate?: string | null;
    onClaimSuccess?: (payload: {
        dayNumber: number;
        rewardLabel: string;
        rewardAmount: string;
        claimedAtText: string;
    }) => void;
};

export function SeasonPassClaimButton({
    canClaim,
    rewardLabel,
    rewardAmount,
    mockDate,
    onClaimSuccess,
}: Readonly<SeasonPassClaimButtonProps>) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleClaim = async () => {
        if (!canClaim || isLoading) {
            return;
        }

        setIsLoading(true);

        try {
            const endpoint = mockDate ? `/api/season-pass/claim?mockDate=${encodeURIComponent(mockDate)}` : "/api/season-pass/claim";
            const response = await fetchWithCsrf(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                showWarning(data.message || "ไม่สามารถรับของวันนี้ได้");
                return;
            }

            onClaimSuccess?.({
                dayNumber: data.dayNumber,
                rewardLabel: data.rewardLabel ?? rewardLabel,
                rewardAmount: data.rewardAmount ?? rewardAmount,
                claimedAtText: data.claimedAtText,
            });
            showSuccess("รับรางวัลสำเร็จ");
            if (!onClaimSuccess) {
                router.refresh();
            }
        } catch (error) {
            console.error("[SEASON_PASS_CLAIM]", error);
            showError("เกิดข้อผิดพลาดในการรับของวันนี้");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            type="button"
            className="mt-5 w-full rounded-full"
            onClick={() => void handleClaim()}
            disabled={!canClaim || isLoading}
        >
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังรับของ
                </>
            ) : canClaim ? (
                "รับของวันนี้"
            ) : (
                "รับไปแล้ววันนี้"
            )}
        </Button>
    );
}
