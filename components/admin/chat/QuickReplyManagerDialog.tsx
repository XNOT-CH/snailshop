"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { showError, showSuccess } from "@/lib/swal";
import type { QuickReplyTemplate } from "@/components/admin/chat/types";

interface QuickReplyManagerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onChanged?: () => void;
}

interface TemplateFormState {
    id: string | null;
    title: string;
    body: string;
}

const EMPTY_FORM: TemplateFormState = { id: null, title: "", body: "" };

export function QuickReplyManagerDialog({
    open,
    onOpenChange,
    onChanged,
}: Readonly<QuickReplyManagerDialogProps>) {
    const [templates, setTemplates] = useState<QuickReplyTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState<TemplateFormState | null>(null);

    useEffect(() => {
        if (!open) {
            setForm(null);
            return;
        }

        let cancelled = false;

        (async () => {
            setIsLoading(true);

            try {
                const response = await fetch("/api/admin/chat/templates", { cache: "no-store" });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message ?? "โหลดเทมเพลตไม่สำเร็จ");
                }

                if (!cancelled) {
                    setTemplates((data.templates ?? []) as QuickReplyTemplate[]);
                }
            } catch (error) {
                if (!cancelled) {
                    showError(error instanceof Error ? error.message : "โหลดเทมเพลตไม่สำเร็จ");
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open]);

    function notifyChanged() {
        onChanged?.();
    }

    async function saveTemplate() {
        if (!form || !form.title.trim() || !form.body.trim()) {
            showError("กรุณากรอกชื่อและเนื้อหาเทมเพลต");
            return;
        }

        setIsSaving(true);

        try {
            const existing = form.id ? templates.find((template) => template.id === form.id) : null;
            const payload = {
                title: form.title.trim(),
                body: form.body.trim(),
                sortOrder: existing?.sortOrder ?? templates.length,
                isActive: existing?.isActive ?? true,
            };
            const response = await fetchWithCsrf(
                form.id ? `/api/admin/chat/templates/${form.id}` : "/api/admin/chat/templates",
                {
                    method: form.id ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message ?? "บันทึกเทมเพลตไม่สำเร็จ");
            }

            const saved = data.template as QuickReplyTemplate;

            setTemplates((current) =>
                form.id
                    ? current.map((template) => (template.id === saved.id ? saved : template))
                    : [...current, saved]
            );
            setForm(null);
            notifyChanged();
            showSuccess(form.id ? "อัปเดตเทมเพลตแล้ว" : "สร้างเทมเพลตแล้ว");
        } catch (error) {
            showError(error instanceof Error ? error.message : "บันทึกเทมเพลตไม่สำเร็จ");
        } finally {
            setIsSaving(false);
        }
    }

    async function patchTemplate(template: QuickReplyTemplate, patch: Partial<QuickReplyTemplate>) {
        try {
            const response = await fetchWithCsrf(`/api/admin/chat/templates/${template.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: template.title,
                    body: template.body,
                    sortOrder: template.sortOrder,
                    isActive: template.isActive,
                    ...patch,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message ?? "อัปเดตเทมเพลตไม่สำเร็จ");
            }

            const saved = data.template as QuickReplyTemplate;

            setTemplates((current) => current.map((item) => (item.id === saved.id ? saved : item)));
            notifyChanged();

            return saved;
        } catch (error) {
            showError(error instanceof Error ? error.message : "อัปเดตเทมเพลตไม่สำเร็จ");
            return null;
        }
    }

    async function moveTemplate(index: number, direction: -1 | 1) {
        const targetIndex = index + direction;

        if (targetIndex < 0 || targetIndex >= templates.length) {
            return;
        }

        const reordered = [...templates];

        [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
        setTemplates(reordered.map((template, position) => ({ ...template, sortOrder: position })));

        await Promise.all([
            patchTemplate(reordered[index], { sortOrder: index }),
            patchTemplate(reordered[targetIndex], { sortOrder: targetIndex }),
        ]);
    }

    async function deleteTemplate(template: QuickReplyTemplate) {
        try {
            const response = await fetchWithCsrf(`/api/admin/chat/templates/${template.id}`, {
                method: "DELETE",
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message ?? "ลบเทมเพลตไม่สำเร็จ");
            }

            setTemplates((current) => current.filter((item) => item.id !== template.id));
            notifyChanged();
            showSuccess("ลบเทมเพลตแล้ว");
        } catch (error) {
            showError(error instanceof Error ? error.message : "ลบเทมเพลตไม่สำเร็จ");
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>จัดการเทมเพลตข้อความ</DialogTitle>
                    <DialogDescription>
                        สร้างข้อความสำเร็จรูปไว้ตอบลูกค้าได้เร็วขึ้น เลือกใช้จากปุ่ม &quot;ข้อความสำเร็จรูป&quot; ในช่องพิมพ์
                    </DialogDescription>
                </DialogHeader>

                {form ? (
                    <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
                        <Input
                            value={form.title}
                            onChange={(event) => setForm({ ...form, title: event.target.value })}
                            placeholder="ชื่อเทมเพลต เช่น แจ้งเวลาทำการ"
                            maxLength={120}
                        />
                        <Textarea
                            value={form.body}
                            onChange={(event) => setForm({ ...form, body: event.target.value })}
                            placeholder="เนื้อหาข้อความที่จะส่งถึงลูกค้า"
                            className="min-h-24"
                            maxLength={5000}
                        />
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setForm(null)}>
                                <X className="mr-1.5 h-4 w-4" />
                                ยกเลิก
                            </Button>
                            <Button type="button" size="sm" onClick={() => void saveTemplate()} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                                {form.id ? "บันทึกการแก้ไข" : "สร้างเทมเพลต"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setForm(EMPTY_FORM)}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        สร้างเทมเพลตใหม่
                    </Button>
                )}

                <ScrollArea className="max-h-[50vh]">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            กำลังโหลดเทมเพลต
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                            ยังไม่มีเทมเพลต
                        </div>
                    ) : (
                        <div className="space-y-2 pr-3">
                            {templates.map((template, index) => (
                                <div
                                    key={template.id}
                                    className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-sm font-semibold text-foreground">{template.title}</p>
                                            {!template.isActive ? (
                                                <Badge variant="secondary" className="text-xs">ปิดใช้งาน</Badge>
                                            ) : null}
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.body}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <Switch
                                            checked={template.isActive}
                                            onCheckedChange={(checked) => void patchTemplate(template, { isActive: checked })}
                                            aria-label={`เปิดใช้งาน ${template.title}`}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => void moveTemplate(index, -1)}
                                            disabled={index === 0}
                                            aria-label="เลื่อนขึ้น"
                                        >
                                            <ArrowUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => void moveTemplate(index, 1)}
                                            disabled={index === templates.length - 1}
                                            aria-label="เลื่อนลง"
                                        >
                                            <ArrowDown className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => setForm({ id: template.id, title: template.title, body: template.body })}
                                            aria-label={`แก้ไข ${template.title}`}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => void deleteTemplate(template)}
                                            aria-label={`ลบ ${template.title}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
