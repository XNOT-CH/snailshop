"use client";

import { useRef, useState } from "react";
import { ChevronUp, FileUp, Layers, Save, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StockSeparatorPicker } from "./StockSeparatorPicker";
import type { StockSeparatorType } from "@/lib/stock";
import { cn } from "@/lib/utils";

interface StockEditorCardProps {
    readonly draft: string;
    readonly onDraftChange: (value: string) => void;
    readonly separator: StockSeparatorType;
    readonly onSeparatorChange: (value: StockSeparatorType) => void;
    readonly items: string[];
    // Set only while the picker differs from what is stored, so the admin can see
    // the effect on stock that is already for sale before committing to it.
    readonly resplit: { before: number; after: number } | null;
    readonly canEdit: boolean;
    readonly isSaving: boolean;
    readonly onSave: () => void;
}

export function StockEditorCard({
    draft,
    onDraftChange,
    separator,
    onSeparatorChange,
    items,
    resplit,
    canEdit,
    isSaving,
    onSave,
}: StockEditorCardProps) {
    const [collapsed, setCollapsed] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importError, setImportError] = useState<string | null>(null);

    const handleImport = async (file: File | undefined) => {
        if (!file) return;
        setImportError(null);
        try {
            const text = await file.text();
            // Append rather than replace: an admin importing a second batch on
            // top of a first would otherwise lose the first without warning.
            onDraftChange(draft.trim() ? `${draft.trimEnd()}\n${text}` : text);
        } catch {
            setImportError("อ่านไฟล์ไม่สำเร็จ กรุณาลองใหม่");
        }
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Layers className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-bold text-primary">จัดการสต็อก</h2>
                    <p className="truncate text-xs text-muted-foreground">
                        วางข้อมูลแล้วดูผลก่อนบันทึก
                    </p>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-xl"
                    onClick={() => setCollapsed((prev) => !prev)}
                    aria-expanded={!collapsed}
                    aria-label={collapsed ? "ขยายส่วนจัดการสต็อก" : "ย่อส่วนจัดการสต็อก"}
                >
                    <ChevronUp className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
                </Button>
            </div>

            {collapsed ? null : (
                <div className="space-y-4 p-5">
                    <div className="space-y-2">
                        <Label htmlFor="stock-separator">เกณฑ์การแยกสต็อก</Label>
                        <StockSeparatorPicker
                            value={separator}
                            onChange={onSeparatorChange}
                            disabled={!canEdit || isSaving}
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="stock-draft">ข้อมูลสต็อก</Label>
                            <Textarea
                                id="stock-draft"
                                value={draft}
                                onChange={(e) => onDraftChange(e.target.value)}
                                disabled={!canEdit || isSaving}
                                placeholder="ข้อมูลสต็อก..."
                                className="min-h-56 rounded-xl font-mono text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>ข้อมูลที่คุณจะได้</Label>
                            <div className="min-h-56 rounded-xl border border-border bg-muted/40 p-3">
                                {items.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        ยังไม่มีรายการ — วางหรือพิมพ์ข้อมูลสต็อกด้านซ้าย
                                    </p>
                                ) : (
                                    <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
                                        {items.map((item, index) => (
                                            <span
                                                key={`${index}-${item}`}
                                                title={item}
                                                className="max-w-full truncate rounded-lg border border-border bg-card px-2 py-1 font-mono text-xs text-foreground"
                                            >
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {resplit ? (
                        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                                เปลี่ยนเกณฑ์แล้ว สต็อกเดิมจะถูกแบ่งใหม่จาก {resplit.before} รายการ
                                เป็น {resplit.after} รายการ — รายการด้านล่างคือผลที่จะเกิด ยังไม่ได้บันทึก
                            </span>
                        </div>
                    ) : null}

                    {importError ? (
                        <p className="text-sm text-destructive">{importError}</p>
                    ) : null}

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                            type="button"
                            onClick={onSave}
                            disabled={!canEdit || isSaving}
                            className="h-11 flex-1 gap-2 rounded-xl"
                        >
                            <Save className="h-4 w-4" />
                            {isSaving ? "กำลังบันทึก..." : `บันทึก ${items.length} รายการ`}
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".txt,text/plain"
                            className="hidden"
                            onChange={(e) => {
                                void handleImport(e.target.files?.[0]);
                                // Reset so picking the same file twice fires again.
                                e.target.value = "";
                            }}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!canEdit || isSaving}
                            className="h-11 gap-2 rounded-xl"
                        >
                            <FileUp className="h-4 w-4" />
                            นำเข้าไฟล์ (.txt)
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
