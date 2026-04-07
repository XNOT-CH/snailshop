"use client";

import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import { useCallback } from "react";

interface QuantitySelectorProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    disabled?: boolean;
    size?: "sm" | "md";
    label?: string;
}

export function QuantitySelector({
    value,
    onChange,
    min = 1,
    max = 99,
    disabled = false,
    size = "md",
    label,
}: Readonly<QuantitySelectorProps>) {
    const handleDecrement = useCallback(() => {
        if (value > min) {
            onChange(value - 1);
        }
    }, [value, min, onChange]);

    const handleIncrement = useCallback(() => {
        if (value < max) {
            onChange(value + 1);
        }
    }, [value, max, onChange]);

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value.replaceAll(/\D/g, "");
            if (raw === "") {
                onChange(min);
                return;
            }
            const num = Number.parseInt(raw, 10);
            if (!Number.isNaN(num)) {
                onChange(Math.min(Math.max(num, min), max));
            }
        },
        [min, max, onChange]
    );

    const isSmall = size === "sm";
    const btnSize = isSmall ? "h-8 w-8" : "h-10 w-10";
    const iconSize = isSmall ? "h-4 w-4" : "h-5 w-5";
    const inputSize = isSmall
        ? "h-8 w-14 text-sm"
        : "h-10 w-20 text-base";

    return (
        <div className="inline-flex flex-col items-center gap-1.5">
            {/* Label */}
            {label && (
                <span className={`font-medium text-muted-foreground ${isSmall ? "text-xs" : "text-sm"}`}>
                    {label}
                </span>
            )}

            <div className="inline-flex items-center gap-2">
                {/* Decrement Button */}
                <button
                    type="button"
                    className={`${btnSize} inline-flex items-center justify-center rounded-lg bg-foreground text-background transition-all hover:opacity-80 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed`}
                    onClick={handleDecrement}
                    disabled={disabled || value <= min}
                    aria-label="ลดจำนวน"
                >
                    <Minus className={iconSize} strokeWidth={2.5} />
                </button>

                {/* Input Field */}
                <Input
                    type="text"
                    inputMode="numeric"
                    value={value}
                    onChange={handleInputChange}
                    disabled={disabled}
                    className={`${inputSize} text-center font-bold rounded-lg border-2 border-border bg-background shadow-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary px-1`}
                    aria-label="จำนวน"
                />

                {/* Increment Button */}
                <button
                    type="button"
                    className={`${btnSize} inline-flex items-center justify-center rounded-lg bg-foreground text-background transition-all hover:opacity-80 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed`}
                    onClick={handleIncrement}
                    disabled={disabled || value >= max}
                    aria-label="เพิ่มจำนวน"
                >
                    <Plus className={iconSize} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
}
