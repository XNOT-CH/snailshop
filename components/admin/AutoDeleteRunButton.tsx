"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Timer, Loader2 } from "lucide-react";
import { showSuccess, showError } from "@/lib/swal";

export function AutoDeleteRunButton() {
    const router = useRouter();
    const [isRunning, setIsRunning] = useState(false);

    const handleRun = async () => {
        setIsRunning(true);
        try {
            const res = await fetch("/api/admin/auto-delete/run");
            const data = await res.json();
            if (data.success) {
                if (data.deleted > 0) {
                    showSuccess(`🗑️ ลบสินค้าครบกำหนดแล้ว ${data.deleted} รายการ`);
                    router.refresh();
                } else {
                    showSuccess("✅ ไม่มีสินค้าที่ต้องลบในขณะนี้");
                }
            } else {
                showError(data.message || "เกิดข้อผิดพลาด");
            }
        } catch {
            showError("ไม่สามารถรันได้");
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleRun}
            disabled={isRunning}
            className="gap-2 border-orange-300 text-orange-600 hover:bg-orange-50"
        >
            {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Timer className="h-4 w-4" />
            )}
            {isRunning ? "กำลังตรวจสอบ..." : "ลบสินค้าครบกำหนด"}
        </Button>
    );
}
