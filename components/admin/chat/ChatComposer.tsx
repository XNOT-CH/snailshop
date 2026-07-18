"use client";

import { ChangeEvent, KeyboardEvent, useRef } from "react";
import { ImagePlus, Loader2, Send, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickReplyPicker } from "@/components/admin/chat/QuickReplyPicker";
import { Textarea } from "@/components/ui/textarea";
import {
    CHAT_IMAGE_ACCEPT_ATTRIBUTE,
    CHAT_MAX_MESSAGE_LENGTH,
} from "@/lib/chatConstraints";
import { cn } from "@/lib/utils";

interface ChatComposerProps {
    draft: string;
    onDraftChange: (value: string) => void;
    isNoteMode: boolean;
    onNoteModeChange: (isNote: boolean) => void;
    canManage: boolean;
    isSending: boolean;
    isUploading: boolean;
    onSend: () => void;
    onImageSelected: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function ChatComposer({
    draft,
    onDraftChange,
    isNoteMode,
    onNoteModeChange,
    canManage,
    isSending,
    isUploading,
    onSend,
    onImageSelected,
}: Readonly<ChatComposerProps>) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSend();
        }
    }

    function insertTemplate(body: string) {
        const textarea = textareaRef.current;
        const remaining = CHAT_MAX_MESSAGE_LENGTH - draft.length;

        if (remaining <= 0) {
            return;
        }

        const insertion = body.slice(0, remaining);

        if (textarea && document.activeElement === textarea) {
            const start = textarea.selectionStart ?? draft.length;
            const end = textarea.selectionEnd ?? draft.length;

            onDraftChange(`${draft.slice(0, start)}${insertion}${draft.slice(end)}`.slice(0, CHAT_MAX_MESSAGE_LENGTH));
        } else {
            onDraftChange(`${draft}${draft && !draft.endsWith("\n") ? "\n" : ""}${insertion}`.slice(0, CHAT_MAX_MESSAGE_LENGTH));
        }

        textarea?.focus();
    }

    const charCount = draft.length;
    const nearLimit = charCount >= CHAT_MAX_MESSAGE_LENGTH * 0.9;

    return (
        <div className="border-t border-border bg-card p-3 sm:p-4">
            <div
                className={cn(
                    "rounded-3xl border p-3 transition-colors",
                    isNoteMode
                        ? "border-amber-400/70 bg-amber-50/70 dark:border-amber-400/40 dark:bg-amber-500/10"
                        : "border-border bg-muted/40"
                )}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={CHAT_IMAGE_ACCEPT_ATTRIBUTE}
                    className="hidden"
                    disabled={!canManage}
                    onChange={onImageSelected}
                />

                {isNoteMode ? (
                    <p className="mb-1 flex items-center gap-1.5 px-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
                        <StickyNote className="h-3.5 w-3.5" />
                        โหมดบันทึกภายใน — ข้อความนี้ลูกค้าจะไม่เห็น
                    </p>
                ) : null}

                <Textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(event) => onDraftChange(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isNoteMode ? "พิมพ์บันทึกภายในสำหรับทีมแอดมิน" : "พิมพ์ข้อความตอบกลับลูกค้า (Enter เพื่อส่ง)"}
                    maxLength={CHAT_MAX_MESSAGE_LENGTH}
                    disabled={!canManage}
                    aria-label={isNoteMode ? "บันทึกภายใน" : "ข้อความตอบกลับลูกค้า"}
                    className="min-h-16 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 sm:min-h-20"
                />

                <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || isSending || !canManage || isNoteMode}
                            className="rounded-full"
                            aria-label="ส่งรูป"
                            title="ส่งรูป (แสดงผล 5 นาทีแล้วหมดอายุอัตโนมัติ)"
                        >
                            {isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <ImagePlus className="h-4 w-4" />
                            )}
                        </Button>

                        <QuickReplyPicker
                            canManage={canManage}
                            disabled={!canManage || isNoteMode}
                            onInsert={insertTemplate}
                        />

                        <Button
                            type="button"
                            variant={isNoteMode ? "default" : "outline"}
                            size="sm"
                            onClick={() => onNoteModeChange(!isNoteMode)}
                            disabled={!canManage}
                            aria-pressed={isNoteMode}
                            className={cn(
                                "rounded-full",
                                isNoteMode && "bg-amber-500 text-white hover:bg-amber-600"
                            )}
                        >
                            <StickyNote className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">โน้ตภายใน</span>
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span
                            className={cn(
                                "text-xs tabular-nums",
                                nearLimit ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                            )}
                        >
                            {charCount}/{CHAT_MAX_MESSAGE_LENGTH}
                        </span>
                        <Button
                            onClick={onSend}
                            disabled={isSending || isUploading || !draft.trim() || !canManage}
                            className="rounded-full px-4"
                        >
                            {isSending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="mr-2 h-4 w-4" />
                            )}
                            {isNoteMode ? "บันทึกโน้ต" : "ส่งข้อความ"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
