"use client";

import * as React from "react";
import { CalendarIcon, CalendarRange, Check, X } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, min } from "date-fns";
import { th } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

// ─── Preset builder (relative to an anchor date) ────────
interface PresetDef {
    label: string;
    build: (anchor: Date) => DateRange;
}

const PRESET_DEFS: PresetDef[] = [
    {
        label: "วันนี้",
        build: (anchor) => ({ from: anchor, to: anchor }),
    },
    {
        label: "3 วัน",
        build: (anchor) => ({ from: subDays(anchor, 2), to: anchor }),
    },
    {
        label: "7 วัน",
        build: (anchor) => ({ from: subDays(anchor, 6), to: anchor }),
    },
    {
        label: "เดือนนี้",
        build: (anchor) => ({
            from: startOfMonth(anchor),
            to: min([endOfMonth(anchor), new Date()]),
        }),
    },
    {
        label: "ปีนี้",
        build: (anchor) => ({
            from: startOfYear(anchor),
            to: min([endOfMonth(anchor), new Date()]),
        }),
    },
];

// ─── Component ──────────────────────────────────────────
interface DateRangePickerProps {
    value?: DateRange;
    onChange: (range: DateRange | undefined) => void;
    placeholder?: string;
    className?: string;
}

export function DateRangePicker({
    value,
    onChange,
    placeholder = "เลือกช่วงวันที่",
    className,
}: DateRangePickerProps) {
    const [open, setOpen] = React.useState(false);

    // Draft state — only committed on "ยืนยัน"
    const [draft, setDraft] = React.useState<DateRange | undefined>(value);
    const [activePreset, setActivePreset] = React.useState<string>("7 วัน");

    // Track which month the calendar is currently showing
    const [displayedMonth, setDisplayedMonth] = React.useState<Date>(new Date());

    // Compute anchor = last day of displayed month (or today if current month)
    const anchor = React.useMemo(() => {
        const now = new Date();
        const endOfDisplayed = endOfMonth(displayedMonth);
        // If displayed month is current or future month, cap at today
        return endOfDisplayed > now ? now : endOfDisplayed;
    }, [displayedMonth]);

    // Sync draft + displayed month when popover opens
    React.useEffect(() => {
        if (open) {
            setDraft(value);
            setDisplayedMonth(value?.to || value?.from || new Date());
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const handlePreset = (preset: PresetDef) => {
        const range = preset.build(anchor);
        setDraft(range);
        setActivePreset(preset.label);
    };

    const handleConfirm = () => {
        onChange(draft);
        setOpen(false);
    };

    const handleCancel = () => {
        setDraft(value); // revert to original
        setOpen(false);
    };

    // Check if draft has a complete range
    const hasCompleteRange = draft?.from && draft?.to;

    // Format display label from committed value
    const displayLabel = React.useMemo(() => {
        if (!value?.from) return null;
        const fromStr = format(value.from, "d MMM yy", { locale: th });
        if (!value.to || value.from.toDateString() === value.to.toDateString()) {
            return fromStr;
        }
        const toStr = format(value.to, "d MMM yy", { locale: th });
        return `${fromStr} – ${toStr}`;
    }, [value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "justify-start text-left font-normal gap-2 h-9 px-3",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="h-4 w-4 shrink-0" />
                    {displayLabel ? (
                        <span className="truncate">{displayLabel}</span>
                    ) : (
                        <span className="truncate">{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                {/* Header */}
                <div className="px-4 pt-3 pb-2 border-b border-border">
                    <div className="flex items-center gap-2 mb-3">
                        <CalendarRange className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">เลือกช่วงวันที่</span>
                    </div>
                    {/* Preset chips */}
                    <div className="flex flex-wrap gap-1.5">
                        {PRESET_DEFS.map((preset) => (
                            <button
                                key={preset.label}
                                onClick={() => handlePreset(preset)}
                                className={cn(
                                    "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                                    activePreset === preset.label
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Calendar — edits draft, not committed value */}
                <Calendar
                    mode="range"
                    selected={draft}
                    onSelect={(range) => {
                        setDraft(range);
                        setActivePreset(""); // clear preset highlight on manual pick
                    }}
                    month={displayedMonth}
                    onMonthChange={setDisplayedMonth}
                    disabled={(date) => date > new Date()}
                    numberOfMonths={1}
                    locale={th}
                    autoFocus
                />

                {/* Footer — selected range + action buttons */}
                <div className="px-4 py-3 border-t border-border space-y-2.5">
                    {/* Show draft range */}
                    {draft?.from && (
                        <p className="text-xs text-center text-muted-foreground">
                            {format(draft.from, "d MMM yyyy", { locale: th })}
                            {draft.to && draft.from.toDateString() !== draft.to.toDateString() && (
                                <span className="text-foreground font-medium">
                                    {" "}→ {format(draft.to, "d MMM yyyy", { locale: th })}
                                </span>
                            )}
                            {!draft.to && (
                                <span className="text-primary font-medium"> → เลือกวันจบ</span>
                            )}
                        </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1"
                            onClick={handleCancel}
                        >
                            <X className="h-3.5 w-3.5" />
                            ยกเลิก
                        </Button>
                        <Button
                            size="sm"
                            className="flex-1 gap-1"
                            disabled={!hasCompleteRange}
                            onClick={handleConfirm}
                        >
                            <Check className="h-3.5 w-3.5" />
                            ยืนยัน
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
