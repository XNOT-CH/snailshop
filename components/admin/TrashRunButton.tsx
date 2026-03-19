"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { showSuccess, showError, showDeleteConfirm } from "@/lib/swal";

interface TrashRunButtonProps {
    count: number;
}

export function TrashRunButton({ count }: TrashRunButtonProps) {
    const router = useRouter();
    const [isRunning, setIsRunning] = useState(false);

    const handleRun = async () => {
        const confirmed = await showDeleteConfirm(`สินค้าครบกำหนด ${count} รายการ`);
        if (!confirmed) return;

        setIsRunning(true);
        try {
            const res = await fetch("/api/admin/auto-delete/run");
            const data = await res.json();
            if (data.success) {
                showSuccess(`🗑️ ลบสำเร็จ ${data.deleted} รายการ`);
                router.refresh();
            } else {
                showError(data.message || "เกิดข้อผิดพลาด");
            }
        } catch {
            showError("ไม่สามารถลบได้");
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <Button
            variant="destructive"
            onClick={handleRun}
            disabled={isRunning}
            className="gap-2"
        >
            {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Trash2 className="h-4 w-4" />
            )}
            {isRunning ? "กำลังลบ..." : `ลบทั้งหมด (${count})`}
        </Button>
    );
}
