"use client";

import { useState } from "react";
import { ClipboardList, Loader2, Settings2 } from "lucide-react";
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
import { QuickReplyManagerDialog } from "@/components/admin/chat/QuickReplyManagerDialog";
import type { QuickReplyTemplate } from "@/components/admin/chat/types";

interface QuickReplyPickerProps {
    canManage: boolean;
    disabled?: boolean;
    onInsert: (body: string) => void;
}

export function QuickReplyPicker({ canManage, disabled, onInsert }: Readonly<QuickReplyPickerProps>) {
    const [open, setOpen] = useState(false);
    const [templates, setTemplates] = useState<QuickReplyTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [managerOpen, setManagerOpen] = useState(false);

    async function loadTemplates() {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/admin/chat/templates", { cache: "no-store" });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message ?? "โหลดเทมเพลตไม่สำเร็จ");
            }

            setTemplates((data.templates ?? []) as QuickReplyTemplate[]);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "โหลดเทมเพลตไม่สำเร็จ");
        } finally {
            setIsLoading(false);
        }
    }

    function handleOpenChange(nextOpen: boolean) {
        setOpen(nextOpen);

        if (nextOpen) {
            void loadTemplates();
        }
    }

    const activeTemplates = templates.filter((template) => template.isActive);

    return (
        <>
            <Popover open={open} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        className="rounded-full"
                        aria-label="ข้อความสำเร็จรูป"
                    >
                        <ClipboardList className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">ข้อความสำเร็จรูป</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" side="top" className="w-80 p-0">
                    <Command>
                        <CommandInput placeholder="ค้นหาเทมเพลต..." />
                        <CommandList>
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    กำลังโหลดเทมเพลต
                                </div>
                            ) : (
                                <>
                                    <CommandEmpty>
                                        {error ?? "ยังไม่มีเทมเพลต กดจัดการเทมเพลตเพื่อสร้างใหม่"}
                                    </CommandEmpty>
                                    <CommandGroup heading="เลือกเพื่อแทรกลงในช่องพิมพ์">
                                        {activeTemplates.map((template) => (
                                            <CommandItem
                                                key={template.id}
                                                value={`${template.title} ${template.body}`}
                                                onSelect={() => {
                                                    onInsert(template.body);
                                                    setOpen(false);
                                                }}
                                                className="flex flex-col items-start gap-0.5"
                                            >
                                                <span className="font-medium">{template.title}</span>
                                                <span className="line-clamp-2 text-xs text-muted-foreground">
                                                    {template.body}
                                                </span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </>
                            )}
                        </CommandList>
                    </Command>
                    {canManage ? (
                        <div className="border-t border-border p-1.5">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-muted-foreground"
                                onClick={() => {
                                    setOpen(false);
                                    setManagerOpen(true);
                                }}
                            >
                                <Settings2 className="mr-2 h-4 w-4" />
                                จัดการเทมเพลต
                            </Button>
                        </div>
                    ) : null}
                </PopoverContent>
            </Popover>

            <QuickReplyManagerDialog
                open={managerOpen}
                onOpenChange={setManagerOpen}
                onChanged={() => void loadTemplates()}
            />
        </>
    );
}
