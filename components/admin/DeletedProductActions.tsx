"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2, Loader2 } from "lucide-react";
import { showSuccess, showError, showConfirm } from "@/lib/swal";
import { PERMISSIONS } from "@/lib/permissions";
import { fetchWithCsrf } from "@/lib/csrf-client";

interface DeletedProductActionsProps {
    productId: string;
    productName: string;
}

export function DeletedProductActions({ productId, productName }: DeletedProductActionsProps) {
    const permissions = useAdminPermissions();
    const canDeleteProducts = permissions.includes(PERMISSIONS.PRODUCT_DELETE);
    const router = useRouter();
    const [busyAction, setBusyAction] = useState<"restore" | "purge" | null>(null);

    const handleRestore = async () => {
        setBusyAction("restore");
        try {
            const res = await fetchWithCsrf(`/api/products/${productId}/restore`, { method: "POST" });
            const data = await res.json();
            if (data.success) {
                showSuccess(`กู้คืน "${productName}" สำเร็จ`);
                router.refresh();
            } else {
                showError(data.message || "กู้คืนไม่สำเร็จ");
            }
        } catch {
            showError("กู้คืนไม่สำเร็จ");
        } finally {
            setBusyAction(null);
        }
    };

    const handlePurge = async () => {
        const confirmed = await showConfirm(
            "ลบถาวร",
            `ลบ "${productName}" ถาวร? ข้อมูลนี้จะไม่สามารถกู้คืนได้อีก`
        );
        if (!confirmed) return;

        setBusyAction("purge");
        try {
            const res = await fetchWithCsrf(`/api/products/${productId}/permanent`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                showSuccess(`ลบ "${productName}" ถาวรแล้ว`);
                router.refresh();
            } else {
                showError(data.message || "ลบไม่สำเร็จ");
            }
        } catch {
            showError("ลบไม่สำเร็จ");
        } finally {
            setBusyAction(null);
        }
    };

    return (
        <div className="flex flex-shrink-0 items-center gap-2">
            <Button
                size="sm"
                variant="outline"
                onClick={handleRestore}
                disabled={!canDeleteProducts || busyAction !== null}
                className="gap-1.5"
            >
                {busyAction === "restore" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                กู้คืน
            </Button>
            <Button
                size="sm"
                variant="destructive"
                onClick={handlePurge}
                disabled={!canDeleteProducts || busyAction !== null}
                className="gap-1.5"
            >
                {busyAction === "purge" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                ลบถาวร
            </Button>
        </div>
    );
}
