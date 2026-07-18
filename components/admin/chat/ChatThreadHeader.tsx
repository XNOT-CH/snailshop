"use client";

import { ArrowLeft, Check, Info, MoreHorizontal, Pin, PinOff, Tag, Trash2, UserRoundCheck, UserRoundPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CHAT_TAG_OPTIONS } from "@/lib/chatAdmin";
import { cn } from "@/lib/utils";
import { getChatTagBadgeClassName } from "@/components/admin/chat/ConversationList";
import {
    type ChatAgent,
    type ChatConversationDetail,
    getConversationBadgeClassName,
    getConversationBadgeVariant,
    getConversationStatusLabel,
} from "@/components/admin/chat/types";

interface ChatThreadHeaderProps {
    conversation: ChatConversationDetail;
    canManage: boolean;
    isUpdatingMeta: boolean;
    agents: ChatAgent[];
    onBack: () => void;
    onTogglePin: () => void;
    onToggleStatus: () => void;
    onToggleTag: (tag: string) => void;
    onAssign: (assigneeId: string | null) => void;
    onDelete: () => void;
    onOpenCustomerInfo: () => void;
}

const UNASSIGNED_VALUE = "__unassigned__";

export function ChatThreadHeader({
    conversation,
    canManage,
    isUpdatingMeta,
    agents,
    onBack,
    onTogglePin,
    onToggleStatus,
    onToggleTag,
    onAssign,
    onDelete,
    onOpenCustomerInfo,
}: Readonly<ChatThreadHeaderProps>) {
    const assigneeLabel = conversation.assignee
        ? conversation.assignee.name || conversation.assignee.username
        : "ยังไม่มีผู้รับผิดชอบ";

    return (
        <div className="border-b border-border px-3 py-3 sm:px-4">
            <div className="flex items-center gap-2.5">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onBack}
                    className="shrink-0 lg:hidden"
                    aria-label="ย้อนกลับ"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>

                <Avatar className="h-10 w-10 shrink-0 border border-border">
                    <AvatarImage
                        src={conversation.user.image ?? undefined}
                        alt={conversation.user.username}
                    />
                    <AvatarFallback>
                        {conversation.user.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">
                            {conversation.user.name || conversation.user.username}
                        </p>
                        <Badge
                            variant={getConversationBadgeVariant(conversation.status)}
                            className={cn("shrink-0 px-2 py-0 text-xs", getConversationBadgeClassName(conversation.status))}
                        >
                            {getConversationStatusLabel(conversation.status)}
                        </Badge>
                        {conversation.isPinned ? (
                            <Pin className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="ปักหมุด" />
                        ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                        @{conversation.user.username}
                        <span className="mx-1.5">·</span>
                        {assigneeLabel}
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!canManage || isUpdatingMeta}
                                aria-label="มอบหมายผู้รับผิดชอบ"
                            >
                                <UserRoundPlus className="h-4 w-4 md:mr-2" />
                                <span className="hidden md:inline">ผู้รับผิดชอบ</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>มอบหมายผู้รับผิดชอบ</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup
                                value={conversation.assigneeId ?? UNASSIGNED_VALUE}
                                onValueChange={(value) => onAssign(value === UNASSIGNED_VALUE ? null : value)}
                            >
                                <DropdownMenuRadioItem value={UNASSIGNED_VALUE}>
                                    ไม่ระบุผู้รับผิดชอบ
                                </DropdownMenuRadioItem>
                                {agents.map((agent) => (
                                    <DropdownMenuRadioItem key={agent.id} value={agent.id}>
                                        <span className="truncate">{agent.name || agent.username}</span>
                                        <span className="ml-1.5 text-xs text-muted-foreground">@{agent.username}</span>
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!canManage || isUpdatingMeta}
                                aria-label="จัดการแท็ก"
                            >
                                <Tag className="h-4 w-4 md:mr-2" />
                                <span className="hidden md:inline">แท็ก</span>
                                {conversation.tags.length > 0 ? (
                                    <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-xs font-semibold text-primary">
                                        {conversation.tags.length}
                                    </span>
                                ) : null}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                แท็กแชท
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {CHAT_TAG_OPTIONS.map((tag) => {
                                    const active = conversation.tags.includes(tag);

                                    return (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => onToggleTag(tag)}
                                            disabled={isUpdatingMeta || !canManage}
                                            aria-pressed={active}
                                            className={cn(
                                                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                                                active
                                                    ? getChatTagBadgeClassName(tag)
                                                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                                            )}
                                        >
                                            {active ? <Check className="h-3 w-3" /> : null}
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onToggleStatus}
                        disabled={!canManage || isUpdatingMeta}
                    >
                        <UserRoundCheck className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">
                            {conversation.status === "OPEN" ? "ปิดเคส" : "เปิดเคสอีกครั้ง"}
                        </span>
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={onOpenCustomerInfo}
                        className="xl:hidden"
                        aria-label="ดูข้อมูลลูกค้า"
                    >
                        <Info className="h-4 w-4" />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="ตัวเลือกเพิ่มเติม">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onClick={onTogglePin} disabled={!canManage || isUpdatingMeta}>
                                {conversation.isPinned ? (
                                    <>
                                        <PinOff className="mr-2 h-4 w-4" />
                                        เลิกปักหมุด
                                    </>
                                ) : (
                                    <>
                                        <Pin className="mr-2 h-4 w-4" />
                                        ปักหมุด
                                    </>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={onDelete}
                                disabled={!canManage}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                ลบแชท
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}
