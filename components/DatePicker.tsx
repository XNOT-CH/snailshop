"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
    value?: Date;
    onChange: (date: Date | undefined) => void;
    placeholder?: string;
    className?: string;
}

export function DatePicker({
    value,
    onChange,
    placeholder = "เลือกวันที่",
    className,
}: Readonly<DatePickerProps>) {
    const [open, setOpen] = React.useState(false);

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
                    {value ? (
                        <span className="truncate">
                            {format(value, "d MMM yyyy", { locale: th })}
                        </span>
                    ) : (
                        <span className="truncate">{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={(date) => {
                        onChange(date);
                        setOpen(false);
                    }}
                    disabled={(date) => date > new Date()}
                    autoFocus
                />
            </PopoverContent>
        </Popover>
    );
}
