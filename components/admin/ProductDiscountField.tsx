"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    getDiscountAmountButtonLabel,
    getDiscountErrorText,
    getDiscountHint,
    getDiscountInputStep,
    getDiscountPlaceholder,
    getDiscountSummary,
    type DiscountMode,
    type DiscountState,
} from "@/lib/features/products/pricing";

interface ProductDiscountFieldProps {
    currency: string;
    pointCurrencyName: string;
    mode: DiscountMode;
    onModeChange: (mode: DiscountMode) => void;
    value: string;
    onValueChange: (value: string) => void;
    state: DiscountState;
    disabled?: boolean;
}

/**
 * The discount control from both product forms. They had the same rules and two
 * separate renderings, so a change to the wording or the validation only ever
 * landed on one of them.
 */
export function ProductDiscountField({
    currency,
    pointCurrencyName,
    mode,
    onModeChange,
    value,
    onValueChange,
    state,
    disabled = false,
}: ProductDiscountFieldProps) {
    return (
        <div className="space-y-2 rounded-2xl border border-border bg-muted/40 p-3">
            <div className="grid grid-cols-2 gap-2">
                <Button
                    type="button"
                    variant={mode === "amount" ? "default" : "outline"}
                    className="rounded-xl"
                    onClick={() => onModeChange("amount")}
                    disabled={disabled}
                >
                    {getDiscountAmountButtonLabel(currency, pointCurrencyName)}
                </Button>
                <Button
                    type="button"
                    variant={mode === "percent" ? "default" : "outline"}
                    className="rounded-xl"
                    onClick={() => onModeChange("percent")}
                    disabled={disabled}
                >
                    ลดเป็น %
                </Button>
            </div>

            <Input
                id="discountPrice"
                name="discountPrice"
                type="number"
                placeholder={getDiscountPlaceholder(mode)}
                min="0"
                max={mode === "percent" ? "99.99" : undefined}
                step={getDiscountInputStep(mode, currency)}
                value={value}
                onChange={(event) => onValueChange(event.target.value)}
                disabled={disabled}
                className={
                    state.hasDiscount
                        ? "border-amber-300 bg-amber-50/40 focus-visible:ring-amber-200 dark:border-amber-500/40 dark:bg-amber-500/10 dark:focus-visible:ring-amber-500/20"
                        : "bg-background"
                }
            />

            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                <span className="text-muted-foreground">
                    {getDiscountHint(mode, currency, pointCurrencyName)}
                </span>
                {state.hasDiscount && !state.isValid ? (
                    <span className="font-medium text-destructive">{getDiscountErrorText(mode)}</span>
                ) : state.normalized !== null ? (
                    <span className="font-medium text-amber-700 dark:text-amber-300">
                        {getDiscountSummary(mode, currency, pointCurrencyName, state.inputNumber, state.normalized)}
                    </span>
                ) : null}
            </div>
        </div>
    );
}
