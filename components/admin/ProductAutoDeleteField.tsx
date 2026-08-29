"use client";

import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    AUTO_DELETE_PRESETS,
    formatAutoDeleteSummary,
} from "@/lib/features/products/autoDelete";

interface ProductAutoDeleteFieldProps {
    enabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
    minutes: string;
    onMinutesChange: (minutes: string) => void;
    disabled?: boolean;
}

/**
 * Shared by the create and edit product forms. It used to live only in the edit
 * form, which is why a new product could not be given a timer without saving it
 * and then opening it again.
 */
export function ProductAutoDeleteField({
    enabled,
    onEnabledChange,
    minutes,
    onMinutesChange,
    disabled = false,
}: ProductAutoDeleteFieldProps) {
    const summary = formatAutoDeleteSummary(minutes);

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                <div className="space-y-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        ลบอัตโนมัติหลังขายหมด
                    </p>
                    <p className="text-xs text-muted-foreground">
                        เมื่อครบเวลา สินค้าจะถูกย้ายเข้าถังขยะ — กู้คืนได้จนกว่าจะกดลบถาวร
                    </p>
                </div>
                <Switch
                    checked={enabled}
                    onCheckedChange={onEnabledChange}
                    disabled={disabled}
                    aria-label="เปิดใช้งานการลบอัตโนมัติ"
                />
            </div>

            {enabled ? (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="rounded-2xl border border-border bg-card p-4">
                        <Label className="text-sm font-medium">เลือกเวลาด่วน</Label>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {AUTO_DELETE_PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    onClick={() => onMinutesChange(preset.value)}
                                    disabled={disabled}
                                    aria-pressed={minutes === preset.value}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                        minutes === preset.value
                                            ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                                            : "border-amber-200 bg-amber-50/70 text-amber-700 hover:bg-amber-100 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4">
                        <Label htmlFor="autoDeleteAfterSale" className="text-sm font-medium">
                            กำหนดเวลาเอง
                        </Label>
                        <div className="mt-3 flex items-center gap-2">
                            <Input
                                id="autoDeleteAfterSale"
                                name="autoDeleteAfterSale"
                                type="number"
                                min="1"
                                placeholder="เช่น 60"
                                value={minutes}
                                onChange={(event) => onMinutesChange(event.target.value)}
                                disabled={disabled}
                                className="w-32"
                            />
                            <span className="text-sm text-muted-foreground">นาที</span>
                        </div>
                        {summary ? (
                            <p className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30">
                                ระยะเวลาที่เลือก: {summary}
                            </p>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
