"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { showConfirm, showError, showSuccess } from "@/lib/swal";

interface SeasonPassSubscriberActionsProps {
    subscriptionId: string;
    customerName: string;
    /** What this sale charged, for the refund confirmation. */
    pricePaid: number | null;
    isRunning: boolean;
}

const EXTEND_DAYS = 7;

/**
 * The two things an admin actually needs when a customer writes in: give back
 * the days they lost, or end the pass and return the credits. Both are logged.
 */
export function SeasonPassSubscriberActions({
    subscriptionId,
    customerName,
    pricePaid,
    isRunning,
}: SeasonPassSubscriberActionsProps) {
    const router = useRouter();
    const [busy, setBusy] = useState<"extend" | "cancel" | null>(null);

    const send = async (body: Record<string, unknown>) => {
        const response = await fetchWithCsrf(`/api/admin/season-pass/subscriptions/${subscriptionId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        return response.json() as Promise<{ success?: boolean; error?: string; message?: string; refundAmount?: number }>;
    };

    const handleExtend = async () => {
        const confirmed = await showConfirm(
            `ต่ออายุให้ ${EXTEND_DAYS} วัน?`,
            `Season Pass ของ "${customerName}" จะถูกขยายออกไปอีก ${EXTEND_DAYS} วัน`,
            "ต่ออายุ",
            "ยกเลิก",
        );
        if (!confirmed) return;

        setBusy("extend");
        try {
            const data = await send({ action: "extend", days: EXTEND_DAYS });
            if (data.success) {
                showSuccess(`ต่ออายุให้ "${customerName}" แล้ว ${EXTEND_DAYS} วัน`);
                router.refresh();
            } else {
                showError(data.error ?? data.message ?? "ต่ออายุไม่สำเร็จ");
            }
        } catch {
            showError("ต่ออายุไม่สำเร็จ");
        } finally {
            setBusy(null);
        }
    };

    const handleCancel = async () => {
        const refundText = pricePaid !== null
            ? `จะคืน ${pricePaid.toLocaleString()} เครดิตให้ลูกค้า`
            : "จะคืนเครดิตตามราคาแพ็กเกจปัจจุบัน (รายการนี้ไม่ได้บันทึกราคาที่จ่ายไว้)";
        const confirmed = await showConfirm(
            "ยกเลิกและคืนเครดิต?",
            `Season Pass ของ "${customerName}" จะสิ้นสุดทันที และ${refundText}`,
            "ยกเลิกและคืนเครดิต",
            "ไม่ทำ",
        );
        if (!confirmed) return;

        setBusy("cancel");
        try {
            const data = await send({ action: "cancel", refund: true });
            if (data.success) {
                showSuccess(`ยกเลิกแล้ว • คืน ${(data.refundAmount ?? 0).toLocaleString()} เครดิต`);
                router.refresh();
            } else {
                showError(data.error ?? data.message ?? "ยกเลิกไม่สำเร็จ");
            }
        } catch {
            showError("ยกเลิกไม่สำเร็จ");
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="flex flex-shrink-0 items-center gap-2">
            <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={handleExtend}
                disabled={busy !== null}
            >
                {busy === "extend" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                ต่อ {EXTEND_DAYS} วัน
            </Button>
            <Button
                type="button"
                size="sm"
                variant="destructive"
                className="gap-1.5"
                onClick={handleCancel}
                disabled={busy !== null || !isRunning}
            >
                {busy === "cancel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                ยกเลิก + คืนเครดิต
            </Button>
        </div>
    );
}
