"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SEPARATOR_OPTIONS, type StockSeparatorType } from "@/lib/stock";
import { cn } from "@/lib/utils";

interface StockSeparatorPickerProps {
    readonly value: StockSeparatorType;
    readonly onChange: (value: StockSeparatorType) => void;
    readonly disabled?: boolean;
}

export function StockSeparatorPicker({
    value,
    onChange,
    disabled,
}: StockSeparatorPickerProps) {
    const [open, setOpen] = useState(false);
    const selected = SEPARATOR_OPTIONS.find((option) => option.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="h-11 w-full justify-between rounded-xl px-4 font-normal"
                >
                    <span className="truncate">
                        {selected?.label ?? "เลือกเกณฑ์การแยกสต็อก"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                // Match the trigger so the list does not jump narrower than the field.
                className="w-[var(--radix-popover-trigger-width)] p-0"
            >
                <Command>
                    <CommandInput placeholder="ค้นหาตัวเลือก..." />
                    <CommandList>
                        <CommandEmpty>ไม่พบตัวเลือกที่ค้นหา</CommandEmpty>
                        <CommandGroup heading={`${SEPARATOR_OPTIONS.length} รายการ`}>
                            {SEPARATOR_OPTIONS.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    // Searchable by description too, so "สเปรดชีต" finds tab.
                                    value={`${option.label} ${option.description}`}
                                    onSelect={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                    className="items-start gap-2"
                                >
                                    <Check
                                        className={cn(
                                            "mt-0.5 h-4 w-4 shrink-0",
                                            option.value === value ? "opacity-100" : "opacity-0",
                                        )}
                                    />
                                    <span className="min-w-0">
                                        <span className="block truncate font-medium">{option.label}</span>
                                        <span className="block text-xs text-muted-foreground">
                                            {option.description}
                                        </span>
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
