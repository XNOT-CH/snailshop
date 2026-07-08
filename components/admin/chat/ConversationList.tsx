"use client";

import { Loader2, Pin, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChatTimestamp } from "@/components/chat/ChatTimestamp";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
    type ChatConversationSummary,
    type ConversationFilter,
    getConversationBadgeClassName,
    getConversationBadgeVariant,
    getConversationStatusLabel,
} from "@/components/admin/chat/types";

const FILTER_OPTIONS: Array<{ value: ConversationFilter; label: string }> = [
    { value: "all", label: "ทั้งหมด" },
    { value: "unread", label: "ยังไม่อ่าน" },
    { value: "open", label: "เปิดเคส" },
    { value: "closed", label: "ปิดแล้ว" },
    { value: "mine", label: "เคสของฉัน" },
];

const CHAT_TAG_BADGE_STYLES: Record<string, string> = {
    "สอบถามราคา": "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/35 dark:bg-sky-500/10 dark:text-sky-200",
    "ปัญหา": "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-200",
    "ด่วน": "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-200",
    "รอตอบ": "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/35 dark:bg-violet-500/10 dark:text-violet-200",
    "ติดตามผล": "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-200",
};

export function getChatTagBadgeClassName(tag: string) {
    return CHAT_TAG_BADGE_STYLES[tag] ?? "border-border bg-muted text-muted-foreground";
}

interface ConversationListProps {
    conversations: ChatConversationSummary[];
    isLoading: boolean;
    error: string | null;
    onRetry: () => void;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    filter: ConversationFilter;
    onFilterChange: (value: ConversationFilter) => void;
    selectedConversationId: string | null;
    onSelect: (conversationId: string) => void;
    nextCursor: string | null;
    isLoadingMore: boolean;
    onLoadMore: () => void;
    className?: string;
}

function ConversationListItem({
    conversation,
    active,
    onSelect,
}: Readonly<{
    conversation: ChatConversationSummary;
    active: boolean;
    onSelect: (conversationId: string) => void;
}>) {
    const fallback = conversation.user.username.slice(0, 2).toUpperCase();
    const hasUnread = conversation.unreadByAdmin > 0;

    return (
        <button
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onSelect(conversation.id)}
            className={cn(
                "w-full rounded-2xl border px-3.5 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                active
                    ? "border-primary/50 bg-primary/10"
                    : "border-border bg-card hover:border-primary/30 hover:bg-muted/60"
            )}
        >
            <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                    <Avatar className="h-11 w-11 border border-border">
                        <AvatarImage
                            src={conversation.user.image ?? undefined}
                            alt={conversation.user.username}
                        />
                        <AvatarFallback>{fallback}</AvatarFallback>
                    </Avatar>
                    {hasUnread ? (
                        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                            {conversation.unreadByAdmin > 99 ? "99+" : conversation.unreadByAdmin}
                        </span>
                    ) : null}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <p
                            className={cn(
                                "truncate text-sm",
                                hasUnread ? "font-bold text-foreground" : "font-semibold text-foreground/90"
                            )}
                        >
                            {conversation.isPinned ? (
                                <Pin className="mr-1 inline h-3.5 w-3.5 -translate-y-px text-amber-500" aria-label="ปักหมุด" />
                            ) : null}
                            {conversation.user.name || conversation.user.username}
                        </p>
                        <ChatTimestamp
                            value={conversation.lastMessageAt}
                            className="shrink-0 text-[11px] text-muted-foreground"
                        />
                    </div>

                    <p className="truncate text-xs text-muted-foreground">@{conversation.user.username}</p>

                    <p
                        className={cn(
                            "mt-1.5 line-clamp-2 text-sm",
                            hasUnread ? "font-medium text-foreground" : "text-muted-foreground"
                        )}
                    >
                        {conversation.lastMessagePreview}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge
                            variant={getConversationBadgeVariant(conversation.status)}
                            className={cn("px-2 py-0 text-[10px]", getConversationBadgeClassName(conversation.status))}
                        >
                            {getConversationStatusLabel(conversation.status)}
                        </Badge>
                        {conversation.tags.map((tag) => (
                            <span
                                key={`${conversation.id}-${tag}`}
                                className={cn(
                                    "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                    getChatTagBadgeClassName(tag)
                                )}
                            >
                                {tag}
                            </span>
                        ))}
                        {conversation.assignee ? (
                            <span className="ml-auto truncate text-[10px] text-muted-foreground">
                                ดูแลโดย {conversation.assignee.name || conversation.assignee.username}
                            </span>
                        ) : null}
                        {conversation.unreadByCustomer > 0 && conversation.lastMessageSenderType === "ADMIN" ? (
                            <span className="ml-auto text-[10px] text-muted-foreground">ลูกค้ายังไม่อ่าน</span>
                        ) : null}
                    </div>
                </div>
            </div>
        </button>
    );
}

function ConversationListSkeleton() {
    return (
        <div className="space-y-2 p-3" aria-hidden>
            {[0, 1, 2, 3].map((row) => (
                <div key={row} className="flex items-start gap-3 rounded-2xl border border-border bg-card px-3.5 py-3">
                    <Skeleton className="h-11 w-11 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/5" />
                        <Skeleton className="h-3 w-4/5" />
                        <Skeleton className="h-3 w-3/5" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function ConversationList({
    conversations,
    isLoading,
    error,
    onRetry,
    searchQuery,
    onSearchChange,
    filter,
    onFilterChange,
    selectedConversationId,
    onSelect,
    nextCursor,
    isLoadingMore,
    onLoadMore,
    className,
}: Readonly<ConversationListProps>) {
    let body: React.ReactNode;

    if (isLoading) {
        body = <ConversationListSkeleton />;
    } else if (error && conversations.length === 0) {
        body = (
            <div className="m-3 flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
                <p>{error}</p>
                <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                    ลองใหม่
                </Button>
            </div>
        );
    } else if (conversations.length === 0) {
        body = (
            <div className="m-3 flex h-28 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                {searchQuery.trim() || filter !== "all" ? "ไม่พบบทสนทนาที่ตรงกับเงื่อนไข" : "ยังไม่มีบทสนทนาจากลูกค้า"}
            </div>
        );
    } else {
        body = (
            <div className="space-y-2 p-3" role="listbox" aria-label="รายการสนทนา">
                {conversations.map((conversation) => (
                    <ConversationListItem
                        key={conversation.id}
                        conversation={conversation}
                        active={conversation.id === selectedConversationId}
                        onSelect={onSelect}
                    />
                ))}
                {nextCursor ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                    >
                        {isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        โหลดเพิ่มเติม
                    </Button>
                ) : null}
            </div>
        );
    }

    return (
        <div className={cn("overflow-hidden rounded-3xl border border-border bg-card shadow-sm lg:flex lg:h-full lg:min-h-0 lg:flex-col", className)}>
            <div className="space-y-3 border-b border-border px-4 py-4">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                        รายการสนทนา {conversations.length > 0 ? `(${conversations.length})` : ""}
                    </p>
                </div>

                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="ค้นหาชื่อ, ผู้ใช้ หรือข้อความ"
                        aria-label="ค้นหาบทสนทนา"
                        className="pl-10"
                    />
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {FILTER_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onFilterChange(option.value)}
                            aria-pressed={filter === option.value}
                            className={cn(
                                "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                                filter === option.value
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {error && conversations.length > 0 ? (
                    <p className="text-xs text-destructive">อัปเดตล่าสุดไม่สำเร็จ กำลังลองใหม่อัตโนมัติ</p>
                ) : null}
            </div>

            <ScrollArea className="h-[min(62dvh,38rem)] lg:h-full lg:flex-1">
                {body}
            </ScrollArea>
        </div>
    );
}
