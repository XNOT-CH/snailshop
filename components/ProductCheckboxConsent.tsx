"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { themeClasses } from "@/lib/theme";

export interface ProductConsentCheckbox {
    id: string;
    title: string;
    description: string | null;
    isRequired: boolean;
}

interface ProductCheckboxConsentProps {
    checkboxes: ProductConsentCheckbox[];
    acceptedIds: string[];
    onChange: (acceptedIds: string[]) => void;
    disabled?: boolean;
    /** Shown above the list; the cart repeats the product name here. */
    heading?: string;
}

/** True when every required box in the list has been ticked. */
export function areRequiredChecksAccepted(
    checkboxes: ProductConsentCheckbox[],
    acceptedIds: string[],
) {
    const accepted = new Set(acceptedIds);
    return checkboxes.every((checkbox) => !checkbox.isRequired || accepted.has(checkbox.id));
}

export function ProductCheckboxConsent({
    checkboxes,
    acceptedIds,
    onChange,
    disabled = false,
    heading,
}: Readonly<ProductCheckboxConsentProps>) {
    if (checkboxes.length === 0) {
        return null;
    }

    const toggle = (id: string, checked: boolean) => {
        onChange(checked ? [...acceptedIds, id] : acceptedIds.filter((acceptedId) => acceptedId !== id));
    };

    return (
        <div className={`${themeClasses.surfaceSoft} space-y-3 rounded-3xl px-4 py-3.5`}>
            {heading && <p className="text-sm font-semibold text-foreground">{heading}</p>}
            {checkboxes.map((checkbox) => (
                <label
                    key={checkbox.id}
                    htmlFor={`product-check-${checkbox.id}`}
                    className="flex cursor-pointer gap-2.5"
                >
                    <Checkbox
                        id={`product-check-${checkbox.id}`}
                        checked={acceptedIds.includes(checkbox.id)}
                        onCheckedChange={(checked) => toggle(checkbox.id, checked === true)}
                        disabled={disabled}
                        className="mt-0.5"
                    />
                    <span className="min-w-0 text-sm leading-relaxed">
                        <span className="font-medium text-foreground">
                            {checkbox.title}
                            {checkbox.isRequired && (
                                <span className="ml-1 text-red-500 dark:text-red-400" aria-label="จำเป็นต้องติ๊ก">
                                    *
                                </span>
                            )}
                        </span>
                        {checkbox.description && (
                            <span className="mt-0.5 block whitespace-pre-line text-muted-foreground">
                                {checkbox.description}
                            </span>
                        )}
                    </span>
                </label>
            ))}
        </div>
    );
}
