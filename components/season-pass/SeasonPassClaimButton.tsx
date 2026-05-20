"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type SeasonPassClaimButtonProps = {
    canClaim: boolean;
    isLoading?: boolean;
    onClaim: () => Promise<void> | void;
};

export function SeasonPassClaimButton({
    canClaim,
    isLoading = false,
    onClaim,
}: Readonly<SeasonPassClaimButtonProps>) {
    return (
        <Button
            type="button"
            className="mt-5 w-full rounded-full"
            onClick={() => void onClaim()}
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
