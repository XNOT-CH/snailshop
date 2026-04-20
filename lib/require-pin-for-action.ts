"use client";

import { showErrorAlert, showPinPrompt } from "@/lib/swal";

export async function requirePinForAction(actionLabel: string) {
    try {
        const response = await fetch("/api/profile");
        const data = await response.json();

        if (!data.success || !data.data?.hasPin) {
            return { allowed: true, pin: null } as const;
        }

        if (data.data?.pinLockedUntil && new Date(data.data.pinLockedUntil).getTime() > Date.now()) {
            await showErrorAlert(
                "PIN ถูกล็อกชั่วคราว",
                `ลองใหม่ได้อีกครั้งหลัง ${new Date(data.data.pinLockedUntil).toLocaleString("th-TH")}`
            );
            return { allowed: false, pin: null } as const;
        }

        const pin = await showPinPrompt(actionLabel);
        if (!pin) {
            return { allowed: false, pin: null } as const;
        }

        return { allowed: true, pin } as const;
    } catch {
        await showErrorAlert("เกิดข้อผิดพลาด", "ไม่สามารถตรวจสอบสถานะ PIN ได้");
        return { allowed: false, pin: null } as const;
    }
}
