"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SpinnerScreen } from "@/components/SpinnerScreen";
import { StockEditorCard } from "@/components/admin/stock/StockEditorCard";
import { StockListCard } from "@/components/admin/stock/StockListCard";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { PERMISSIONS } from "@/lib/permissions";
import { showConfirm, showError, showSuccess } from "@/lib/swal";
import { joinStock, splitStock, type StockSeparatorType } from "@/lib/stock";

export default function StockManagementPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params.id as string;
    const permissions = useAdminPermissions();
    const canEdit = permissions.includes(PERMISSIONS.PRODUCT_EDIT);

    const [isFetching, setIsFetching] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [productName, setProductName] = useState("");

    // `stored` is what the server holds; `draft` is only the textarea. They are
    // separate because the top card stages new stock and appends on save — it is
    // not a second editor over the same blob.
    const [stored, setStored] = useState("");
    const [draft, setDraft] = useState("");
    const [separator, setSeparator] = useState<StockSeparatorType>("newline");
    const [savedSeparator, setSavedSeparator] = useState<StockSeparatorType>("newline");

    const storedItems = useMemo(
        () => splitStock(stored, separator).map((text, index) => ({ index, text })),
        [stored, separator],
    );
    const draftItems = useMemo(() => splitStock(draft, separator), [draft, separator]);

    // What the stored blob splits into under the separator currently on the row,
    // so a change can be described as "was N, becomes M" before anything is written.
    const storedCountBefore = useMemo(
        () => splitStock(stored, savedSeparator).length,
        [stored, savedSeparator],
    );

    // Non-null only while the choice differs from what is stored AND the split
    // actually changes — a separator swap that lands on the same count is not
    // worth a warning.
    const resplit = useMemo(() => {
        if (separator === savedSeparator || stored.trim() === "") return null;
        const after = storedItems.length;
        return after === storedCountBefore ? null : { before: storedCountBefore, after };
    }, [separator, savedSeparator, stored, storedItems.length, storedCountBefore]);

    const loadStock = useCallback(async () => {
        setIsFetching(true);
        try {
            const res = await fetch(`/api/products/${productId}`);
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message ?? "โหลดข้อมูลไม่สำเร็จ");

            const nextSeparator = (data.data.stockSeparator || "newline") as StockSeparatorType;
            setProductName(data.data.name ?? "");
            setStored(data.data.isSold ? "" : (data.data.secretData ?? ""));
            setSeparator(nextSeparator);
            setSavedSeparator(nextSeparator);
        } catch (error) {
            showError(error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ");
            router.push("/admin/products");
        } finally {
            setIsFetching(false);
        }
    }, [productId, router]);

    useEffect(() => {
        void loadStock();
    }, [loadStock]);

    /**
     * The one writer. Everything that changes stock — appending a batch, deleting
     * a row, reordering, clearing — goes through here, so secretData and
     * stockSeparator always reach the server together.
     */
    const persist = useCallback(
        async (nextSecretData: string, nextSeparator: StockSeparatorType, successMessage: string) => {
            if (!canEdit) {
                showError("คุณไม่มีสิทธิ์แก้ไขสินค้า");
                return false;
            }

            setIsSaving(true);
            try {
                const res = await fetchWithCsrf(`/api/products/${productId}/stock`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ secretData: nextSecretData, stockSeparator: nextSeparator }),
                });
                const data = await res.json().catch(() => ({}));

                if (!res.ok) {
                    showError(data.message || `บันทึกไม่สำเร็จ (${res.status})`);
                    return false;
                }

                setStored(nextSecretData);
                setSavedSeparator(nextSeparator);
                showSuccess(successMessage);
                return true;
            } catch (error) {
                showError(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
                return false;
            } finally {
                setIsSaving(false);
            }
        },
        [canEdit, productId],
    );

    const handleSave = async () => {
        const separatorChanged = separator !== savedSeparator;

        if (draftItems.length === 0 && !separatorChanged) {
            showError("ยังไม่มีข้อมูลให้บันทึก");
            return;
        }

        // Changing the separator re-splits stock that is already for sale, and
        // takeFirstStock uses the stored separator to decide what the next buyer
        // receives — so the count moving is the thing worth stopping on.
        if (separatorChanged && stored.trim() !== "") {
            const after = splitStock(stored, separator).length;
            const confirmed = await showConfirm(
                "เปลี่ยนเกณฑ์การแยกสต็อก?",
                `สต็อกเดิมของ "${productName}" จะถูกแบ่งใหม่จาก ${storedCountBefore} รายการ เป็น ${after} รายการ `
                + "และนี่คือสิ่งที่ลูกค้าจะได้รับตอนซื้อ",
                "เปลี่ยนและบันทึก",
            );
            if (!confirmed) return;
        }

        const merged = [...splitStock(stored, separator), ...draftItems];
        const ok = await persist(
            joinStock(merged, separator),
            separator,
            `บันทึก ${draftItems.length} รายการแล้ว`,
        );
        if (ok) setDraft("");
    };

    const handleDelete = async (index: number) => {
        const target = storedItems.find((item) => item.index === index);
        if (!target) return;

        const confirmed = await showConfirm(
            "ลบรายการนี้?",
            `จะลบ "${target.text.slice(0, 60)}" ออกจากสต็อกถาวร กู้คืนไม่ได้`,
            "ลบรายการ",
        );
        if (!confirmed) return;

        const remaining = storedItems.filter((item) => item.index !== index).map((item) => item.text);
        await persist(joinStock(remaining, separator), separator, "ลบรายการแล้ว");
    };

    const handleMoveToFront = async (index: number) => {
        const target = storedItems.find((item) => item.index === index);
        if (!target) return;

        const rest = storedItems.filter((item) => item.index !== index).map((item) => item.text);
        await persist(joinStock([target.text, ...rest], separator), separator, "ย้ายไปบนสุดแล้ว");
    };

    const handleClearAll = async () => {
        const confirmed = await showConfirm(
            "ล้างสต็อกทั้งหมด?",
            `จะลบสต็อกทั้ง ${storedItems.length} รายการของ "${productName}" และสินค้าจะกลายเป็นสถานะขายหมดทันที กู้คืนไม่ได้`,
            "ล้างทั้งหมด",
        );
        if (!confirmed) return;

        await persist("", separator, "ล้างสต็อกทั้งหมดแล้ว");
    };

    const handleExport = () => {
        // The raw blob, joined the way it is stored, so the file round-trips back
        // through this page's own import button. No BOM — it would ride along into
        // the first item on re-import and end up in a customer's hands.
        const blob = new Blob([joinStock(storedItems.map((item) => item.text), separator)], {
            type: "text/plain;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `stock-${productId}-${new Date().toISOString().slice(0, 10)}.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    if (isFetching) {
        return <SpinnerScreen label="กำลังโหลดสต็อก..." />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <Link
                        href="/admin/products"
                        className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        กลับไปรายการสินค้า
                    </Link>
                    <h1 className="flex items-center gap-2 text-2xl font-bold">
                        <Package className="h-6 w-6 text-primary" />
                        จัดการสต็อก
                    </h1>
                    <p className="mt-1 text-muted-foreground">{productName}</p>
                </div>

                <Badge variant="secondary" className="px-3 py-1 text-base">
                    {storedItems.length} รายการ
                </Badge>
            </div>

            <StockEditorCard
                draft={draft}
                onDraftChange={setDraft}
                separator={separator}
                onSeparatorChange={setSeparator}
                items={draftItems}
                resplit={resplit}
                canEdit={canEdit}
                isSaving={isSaving}
                onSave={() => void handleSave()}
            />

            <StockListCard
                items={storedItems}
                canEdit={canEdit}
                isBusy={isSaving}
                onDelete={(index) => void handleDelete(index)}
                onMoveToFront={(index) => void handleMoveToFront(index)}
                onClearAll={() => void handleClearAll()}
                onExport={handleExport}
                onRefresh={() => void loadStock()}
            />
        </div>
    );
}
