"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { ChatTimestamp } from "@/components/chat/ChatTimestamp";
import { cn } from "@/lib/utils";

export interface ChatRenderableMessage {
    id: string;
    body: string;
    kind: "TEXT" | "IMAGE";
    createdAt: string;
    imageUrl: string | null;
    imageExpiresAt: string | null;
    isExpired: boolean;
}

interface ChatMessageContentProps {
    message: ChatRenderableMessage;
    tone: "primary" | "neutral";
    timestampMode?: "relative" | "datetime";
}

export function ChatMessageContent({
    message,
    tone,
    timestampMode = "relative",
}: Readonly<ChatMessageContentProps>) {
    const [failedImageKey, setFailedImageKey] = useState<string | null>(null);
    const imageKey = `${message.id}:${message.imageUrl ?? ""}`;
    const canShowImage =
        message.kind === "IMAGE" &&
        message.imageUrl &&
        !message.isExpired &&
        failedImageKey !== imageKey;

    return (
        <>
            {canShowImage ? (
                // eslint-disable-next-line @next/next/no-img-element -- Protected chat media relies on same-origin cookie auth.
                <img
                    key={imageKey}
                    src={message.imageUrl}
                    alt="รูปภาพในแชท"
                    className="max-h-72 w-full rounded-[20px] object-cover"
                    loading="lazy"
                    onError={() => setFailedImageKey(imageKey)}
                />
            ) : null}

            {message.kind === "IMAGE" && !canShowImage ? (
                <div
                    className={cn(
                        "flex items-center gap-2 rounded-[20px] border px-3 py-2 text-xs",
                        tone === "primary"
                            ? "border-white/20 bg-white/10 text-blue-50"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                    )}
                >
                    <ImageOff className="h-3.5 w-3.5 shrink-0" />
                    <span>{message.isExpired ? "รูปภาพหมดอายุแล้ว" : "เปิดรูปภาพไม่ได้"}</span>
                </div>
            ) : null}

            {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}

            <ChatTimestamp
                value={message.createdAt}
                mode={timestampMode}
                className={cn(
                    "mt-2 block text-[11px]",
                    tone === "primary" ? "text-blue-100" : "text-slate-400"
                )}
            />
        </>
    );
}
