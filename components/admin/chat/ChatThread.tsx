"use client";

import { useEffect, useRef } from "react";
import { Loader2, StickyNote } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChatMessageContent } from "@/components/chat/ChatMessageContent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatConversationDetail, ChatMessage } from "@/components/admin/chat/types";

interface ChatThreadProps {
    conversation: ChatConversationDetail;
    hasMoreOlderMessages: boolean;
    isLoadingOlder: boolean;
    onLoadOlder: () => void;
}

function formatDaySeparator(isoDate: string) {
    const date = new Date(isoDate);
    const today = new Date();
    const yesterday = new Date(today);

    yesterday.setDate(today.getDate() - 1);

    const sameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    if (sameDay(date, today)) {
        return "วันนี้";
    }

    if (sameDay(date, yesterday)) {
        return "เมื่อวาน";
    }

    return date.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

function getDayKey(isoDate: string) {
    const date = new Date(isoDate);

    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

interface MessageGroup {
    dayKey: string;
    dayLabel: string;
    senderType: ChatMessage["senderType"];
    messages: ChatMessage[];
}

function groupMessages(messages: ChatMessage[]): MessageGroup[] {
    const groups: MessageGroup[] = [];

    for (const message of messages) {
        const dayKey = getDayKey(message.createdAt);
        const lastGroup = groups.at(-1);

        if (lastGroup && lastGroup.dayKey === dayKey && lastGroup.senderType === message.senderType) {
            lastGroup.messages.push(message);
            continue;
        }

        groups.push({
            dayKey,
            dayLabel: formatDaySeparator(message.createdAt),
            senderType: message.senderType,
            messages: [message],
        });
    }

    return groups;
}

function NoteBubble({ message }: Readonly<{ message: ChatMessage }>) {
    return (
        <div className="flex justify-end">
            <div className="max-w-[90%] rounded-2xl border border-dashed border-amber-400/70 bg-amber-50 px-3.5 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100 sm:max-w-[85%]">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
                    <StickyNote className="h-3.5 w-3.5" />
                    บันทึกภายใน — ลูกค้าไม่เห็น
                </p>
                <ChatMessageContent message={message} tone="neutral" timestampMode="datetime" />
            </div>
        </div>
    );
}

function MessageBubble({
    message,
    isFirstInGroup,
    showAvatar,
    userImage,
    username,
    statusLabel,
}: Readonly<{
    message: ChatMessage;
    isFirstInGroup: boolean;
    showAvatar: boolean;
    userImage: string | null;
    username: string;
    statusLabel: string | null;
}>) {
    const isAdmin = message.senderType === "ADMIN";

    return (
        <div className={cn("flex items-end gap-2", isAdmin ? "justify-end" : "justify-start", !isFirstInGroup && "mt-1")}>
            {!isAdmin && (
                <div className="w-8 shrink-0">
                    {showAvatar ? (
                        <Avatar className="h-8 w-8 border border-border">
                            <AvatarImage src={userImage ?? undefined} alt={username} />
                            <AvatarFallback className="text-[10px]">
                                {username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    ) : null}
                </div>
            )}
            <div
                className={cn(
                    "max-w-[85%] rounded-3xl px-3.5 py-3 text-sm shadow-sm sm:max-w-[75%] sm:px-4",
                    isAdmin
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground border border-border"
                )}
            >
                <ChatMessageContent
                    message={message}
                    tone={isAdmin ? "primary" : "neutral"}
                    timestampMode="datetime"
                    statusLabel={statusLabel}
                />
            </div>
        </div>
    );
}

export function ChatThread({
    conversation,
    hasMoreOlderMessages,
    isLoadingOlder,
    onLoadOlder,
}: Readonly<ChatThreadProps>) {
    const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
    const lastMessageId = conversation.messages.at(-1)?.id ?? null;
    const lastScrollAnchorRef = useRef<string | null>(null);

    // Scroll to the bottom only when the newest message changes (a send or an
    // incoming message) — not when older history is prepended.
    useEffect(() => {
        const anchor = `${conversation.id}:${lastMessageId ?? ""}`;

        if (lastScrollAnchorRef.current === anchor) {
            return;
        }

        const isNewConversation = !lastScrollAnchorRef.current?.startsWith(`${conversation.id}:`);

        lastScrollAnchorRef.current = anchor;
        endOfMessagesRef.current?.scrollIntoView({
            behavior: isNewConversation ? "auto" : "smooth",
            block: "end",
        });
    }, [conversation.id, lastMessageId]);

    const groups = groupMessages(conversation.messages);

    // Read receipt under the very last ADMIN message only.
    const lastAdminMessage = [...conversation.messages].reverse().find((message) => message.senderType === "ADMIN");
    const customerLastReadTime = conversation.customerLastReadAt
        ? new Date(conversation.customerLastReadAt).getTime()
        : null;
    const lastAdminReadLabel = lastAdminMessage
        ? (customerLastReadTime !== null && customerLastReadTime >= new Date(lastAdminMessage.createdAt).getTime()
            ? "ลูกค้าอ่านแล้ว"
            : "ลูกค้ายังไม่อ่าน")
        : null;

    return (
        <ScrollArea className="min-h-[18rem] flex-1 bg-muted/40 p-4 sm:p-5 lg:min-h-0 [&_[data-slot=scroll-area-viewport]]:h-full">
            <div className="space-y-3">
                {hasMoreOlderMessages ? (
                    <div className="flex justify-center">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onLoadOlder}
                            disabled={isLoadingOlder}
                            className="rounded-full text-xs"
                        >
                            {isLoadingOlder ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                            ดูข้อความก่อนหน้า
                        </Button>
                    </div>
                ) : null}

                {conversation.messages.length === 0 ? (
                    <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                        ยังไม่มีข้อความในบทสนทนานี้
                    </div>
                ) : null}

                {groups.map((group, groupIndex) => {
                    const showDaySeparator = groupIndex === 0 || groups[groupIndex - 1].dayKey !== group.dayKey;

                    return (
                        <div key={`${group.dayKey}-${group.messages[0].id}`} className="space-y-1">
                            {showDaySeparator ? (
                                <div className="flex items-center gap-3 py-2" role="separator" aria-label={group.dayLabel}>
                                    <span className="h-px flex-1 bg-border" />
                                    <span className="rounded-full bg-muted px-3 py-0.5 text-xs font-medium text-muted-foreground">
                                        {group.dayLabel}
                                    </span>
                                    <span className="h-px flex-1 bg-border" />
                                </div>
                            ) : null}

                            {group.senderType === "NOTE"
                                ? group.messages.map((message) => <NoteBubble key={message.id} message={message} />)
                                : group.messages.map((message, index) => (
                                    <MessageBubble
                                        key={message.id}
                                        message={message}
                                        isFirstInGroup={index === 0}
                                        showAvatar={index === group.messages.length - 1}
                                        userImage={conversation.user.image}
                                        username={conversation.user.username}
                                        statusLabel={message.id === lastAdminMessage?.id ? lastAdminReadLabel : null}
                                    />
                                ))}
                        </div>
                    );
                })}

                <div ref={endOfMessagesRef} />
            </div>
        </ScrollArea>
    );
}
