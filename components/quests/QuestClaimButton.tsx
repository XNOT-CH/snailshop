"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_ROUTES } from "@/lib/constants/apiRoutes";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { showError, showSuccess } from "@/lib/swal";

interface QuestClaimButtonProps {
    questId: string;
    claimed: boolean;
    claimable: boolean;
    ctaHref: string | null;
}

export function QuestClaimButton({
    questId,
    claimed,
    claimable,
    ctaHref,
}: Readonly<QuestClaimButtonProps>) {
    const router = useRouter();
    const [isClaiming, setIsClaiming] = useState(false);

    const handleClaim = useCallback(async () => {
        if (isClaiming) return;
        setIsClaiming(true);
        try {
            const res = await fetchWithCsrf(API_ROUTES.QUEST_CLAIM, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questId }),
            });
            const body = await res.json().catch(() => null);
            if (res.ok && body?.success) {
                showSuccess(body.message ?? "รับรางวัลสำเร็จ");
                router.refresh();
            } else {
                showError(body?.message ?? "ไม่สามารถรับรางวัลได้");
            }
        } catch {
            showError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsClaiming(false);
        }
    }, [isClaiming, questId, router]);

    if (claimed) {
        return (
            <Button variant="outline" size="sm" className="pointer-events-none gap-1.5 rounded-xl border-emerald-500/40 text-emerald-600 dark:text-emerald-400" tabIndex={-1}>
                <CheckCircle2 className="h-4 w-4" />
                รับแล้ว
            </Button>
        );
    }

    if (claimable) {
        return (
            <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => void handleClaim()} disabled={isClaiming}>
                {isClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                {isClaiming ? "กำลังรับ..." : "รับรางวัล"}
            </Button>
        );
    }

    return (
        <Button asChild size="sm" variant="outline" className="rounded-xl">
            <Link href={ctaHref ?? "/"} prefetch={false}>ไปทำเลย</Link>
        </Button>
    );
}
