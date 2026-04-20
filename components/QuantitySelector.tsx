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
                    className={`${btnSize} inline-flex items-center justify-center rounded-xl border border-border/70 bg-accent/70 text-foreground transition-all hover:bg-accent hover:text-primary active:scale-95 disabled:cursor-not-allowed disabled:opacity-30`}
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
                    className={`${inputSize} rounded-xl border border-primary/20 bg-background px-1 text-center font-bold text-foreground shadow-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/35`}
                    aria-label="จำนวน"
                />

                {/* Increment Button */}
                <button
                    type="button"
                    className={`${btnSize} inline-flex items-center justify-center rounded-xl border border-border/70 bg-card text-foreground transition-all hover:bg-accent hover:text-primary active:scale-95 disabled:cursor-not-allowed disabled:opacity-30`}
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
