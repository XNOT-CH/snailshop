"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
    ArrowLeft,
    ImagePlus,
    Loader2,
    MessageSquareText,
    Search,
    Send,
    Trash2,
    UserRoundCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChatMessageContent } from "@/components/chat/ChatMessageContent";
import { ChatTimestamp } from "@/components/chat/ChatTimestamp";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { compressImage } from "@/lib/compressImage";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { showDeleteConfirm, showError, showSuccess } from "@/lib/swal";

interface ChatMessage {
    id: string;
    body: string;
    kind: "TEXT" | "IMAGE";
    senderType: "CUSTOMER" | "ADMIN";
    createdAt: string;
    senderUserId: string | null;
    imageUrl: string | null;
    imageExpiresAt: string | null;
    isExpired: boolean;
}

interface ChatConversationSummary {
    id: string;
    status: "OPEN" | "CLOSED";
    subject: string | null;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string;
    customerLastReadAt: string | null;
    adminLastReadAt: string | null;
    closedAt: string | null;
    unreadByAdmin: number;
    unreadByCustomer: number;
    lastMessagePreview: string;
    lastMessageSenderType: "CUSTOMER" | "ADMIN" | null;
    user: {
        id: string;
        username: string;
        name: string | null;
        image: string | null;
        email: string | null;
    };
}

interface ChatConversationDetail
    extends Omit<
        ChatConversationSummary,
        "unreadByAdmin" | "unreadByCustomer" | "lastMessagePreview" | "lastMessageSenderType"
    > {
    messages: ChatMessage[];
}

function MessageBubble({ message }: Readonly<{ message: ChatMessage }>) {
    const isAdmin = message.senderType === "ADMIN";

    return (
        <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-[90%] rounded-[26px] px-3.5 py-3 text-sm shadow-sm sm:max-w-[85%] sm:px-4 ${
                    isAdmin ? "bg-[#145de7] text-white" : "bg-slate-100 text-slate-900"
                }`}
            >
                <ChatMessageContent
                    message={message}
                    tone={isAdmin ? "primary" : "neutral"}
                    timestampMode="datetime"
                />
            </div>
        </div>
    );
}

export default function AdminChatInbox() {
    const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [selectedConversation, setSelectedConversation] = useState<ChatConversationDetail | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [draft, setDraft] = useState("");
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [isLoadingConversation, setIsLoadingConversation] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSending, startSending] = useTransition();
    const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const filteredConversations = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        if (!normalizedQuery) {
            return conversations;
        }

        return conversations.filter((conversation) => {
            const haystacks = [
                conversation.user.username,
                conversation.user.name ?? "",
                conversation.user.email ?? "",
                conversation.lastMessagePreview,
            ];

            return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }, [conversations, searchQuery]);

    useEffect(() => {
        void refreshList();
    }, []);

    useEffect(() => {
        if (!selectedConversationId && conversations[0]?.id && window.matchMedia("(min-width: 1024px)").matches) {
            setSelectedConversationId(conversations[0].id);
        }
    }, [conversations, selectedConversationId]);

    useEffect(() => {
        if (!selectedConversationId) {
            return;
        }

        void refreshConversation(selectedConversationId);

        const interval = window.setInterval(() => {
            void refreshList(false);
            void refreshConversation(selectedConversationId, false);
        }, 5000);

        return () => window.clearInterval(interval);
    }, [selectedConversationId]);

    useEffect(() => {
        if (!selectedConversation) {
            return;
        }

        endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [selectedConversation]);

    async function refreshList(showLoader = true) {
        if (showLoader) {
            setIsLoadingList(true);
        }

        try {
            const response = await fetch("/api/admin/chat/conversations", { cache: "no-store" });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message ?? "Failed to load conversations");
            }

            setConversations(data.conversations);
        } catch (error) {
            showError(error instanceof Error ? error.message : "โหลดรายการแชทไม่สำเร็จ");
        } finally {
            if (showLoader) {
                setIsLoadingList(false);
            }
        }
    }

    async function refreshConversation(conversationId: string, showLoader = true) {
        if (showLoader) {
            setIsLoadingConversation(true);
        }

        try {
            const response = await fetch(`/api/admin/chat/conversations/${conversationId}`, {
                cache: "no-store",
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message ?? "Failed to load conversation");
            }

            setSelectedConversation(data.conversation);
            await fetchWithCsrf(`/api/admin/chat/conversations/${conversationId}/read`, { method: "POST" });
            setConversations((current) =>
                current.map((conversation) =>
                    conversation.id === conversationId ? { ...conversation, unreadByAdmin: 0 } : conversation
                )
            );
        } catch (error) {
            showError(error instanceof Error ? error.message : "โหลดบทสนทนาไม่สำเร็จ");
        } finally {
            if (showLoader) {
                setIsLoadingConversation(false);
            }
        }
    }

    function handleSendMessage() {
        const message = draft.trim();

        if (!message || !selectedConversationId) {
            return;
        }

        startSending(async () => {
            try {
                const response = await fetchWithCsrf(`/api/admin/chat/conversations/${selectedConversationId}/messages`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ message }),
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message ?? "Failed to send message");
                }

                setDraft("");
                setSelectedConversation(data.conversation);
                await refreshList(false);
            } catch (error) {
                showError(error instanceof Error ? error.message : "ส่งข้อความไม่สำเร็จ");
            }
        });
    }

    async function handleImageSelected(event: ChangeEvent<HTMLInputElement>) {
        const originalFile = event.target.files?.[0];

        if (!originalFile || !selectedConversationId) {
            return;
        }

        setIsUploading(true);

        try {
            const fileToUpload =
                originalFile.type === "image/gif"
                    ? originalFile
                    : await compressImage(originalFile, 500 * 1024);
            const formData = new FormData();

            formData.append("file", fileToUpload, fileToUpload.name);

            const response = await fetchWithCsrf(`/api/admin/chat/conversations/${selectedConversationId}/images`, {
                method: "POST",
                body: formData,
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message ?? "Failed to upload image");
            }

            setSelectedConversation(data.conversation);
            await refreshList(false);
        } catch (error) {
            showError(error instanceof Error ? error.message : "ส่งรูปภาพไม่สำเร็จ");
        } finally {
            event.target.value = "";
            setIsUploading(false);
        }
    }

    async function handleToggleStatus() {
        if (!selectedConversation) {
            return;
        }

        const nextStatus = selectedConversation.status === "OPEN" ? "CLOSED" : "OPEN";

        try {
            const response = await fetchWithCsrf(`/api/admin/chat/conversations/${selectedConversation.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: nextStatus }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message ?? "Failed to update status");
            }

            setSelectedConversation(data.conversation);
            await refreshList(false);
            showSuccess(nextStatus === "CLOSED" ? "ปิดเคสแชทแล้ว" : "เปิดเคสแชทแล้ว");
        } catch (error) {
            showError(error instanceof Error ? error.message : "เปลี่ยนสถานะไม่สำเร็จ");
        }
    }

    async function handleDeleteConversation() {
        if (!selectedConversation) {
            return;
        }

        const confirmed = await showDeleteConfirm(
            selectedConversation.user.name || selectedConversation.user.username
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetchWithCsrf(`/api/admin/chat/conversations/${selectedConversation.id}`, {
                method: "DELETE",
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message ?? "Failed to delete conversation");
            }

            handleBackToList();
            await refreshList(false);
            showSuccess("ลบห้องแชทแล้ว");
        } catch (error) {
            showError(error instanceof Error ? error.message : "ลบห้องแชทไม่สำเร็จ");
        }
    }

    function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    }

    function handleSelectConversation(conversationId: string) {
        setSelectedConversationId(conversationId);
    }

    function handleBackToList() {
        setSelectedConversationId(null);
        setSelectedConversation(null);
        setDraft("");
    }

    const isConversationSelected = Boolean(selectedConversationId);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                        <MessageSquareText className="h-6 w-6 text-[#145de7]" />
                        กล่องข้อความลูกค้า
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        ตอบลูกค้าแบบต่อเนื่องจากหน้าเว็บ พร้อมดูข้อความที่ยังไม่อ่านและจัดการเคสได้ในที่เดียว
                    </p>
                </div>

                <div className="relative w-full max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="ค้นหาจากชื่อผู้ใช้ อีเมล หรือข้อความล่าสุด"
                        className="pl-10"
                    />
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                <div
                    className={`${
                        isConversationSelected ? "hidden lg:block" : "block"
                    } overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm`}
                >
                    <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
                        <p className="text-sm font-semibold text-slate-900">
                            รายการสนทนา {filteredConversations.length > 0 ? `(${filteredConversations.length})` : ""}
                        </p>
                    </div>

                    <ScrollArea className="h-[min(68dvh,40rem)] lg:h-[640px]">
                        <div className="space-y-2 p-3">
                            {isLoadingList ? (
                                <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    กำลังโหลดบทสนทนา
                                </div>
                            ) : filteredConversations.length === 0 ? (
                                <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-muted-foreground">
                                    ยังไม่มีบทสนทนาจากลูกค้า
                                </div>
                            ) : (
                                filteredConversations.map((conversation) => {
                                    const active = conversation.id === selectedConversationId;
                                    const fallback = conversation.user.username.slice(0, 2).toUpperCase();

                                    return (
                                        <button
                                            key={conversation.id}
                                            type="button"
                                            onClick={() => handleSelectConversation(conversation.id)}
                                            className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                                active
                                                    ? "border-[#145de7]/50 bg-[#eef4ff]"
                                                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <Avatar className="h-11 w-11 border border-slate-200">
                                                    <AvatarImage
                                                        src={conversation.user.image ?? undefined}
                                                        alt={conversation.user.username}
                                                    />
                                                    <AvatarFallback>{fallback}</AvatarFallback>
                                                </Avatar>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate font-semibold text-slate-900">
                                                                {conversation.user.name || conversation.user.username}
                                                            </p>
                                                            <p className="truncate text-xs text-slate-500">
                                                                @{conversation.user.username}
                                                            </p>
                                                        </div>

                                                        <div className="flex shrink-0 flex-col items-end gap-2">
                                                            <Badge
                                                                variant={
                                                                    conversation.status === "OPEN"
                                                                        ? "default"
                                                                        : "secondary"
                                                                }
                                                                className={
                                                                    conversation.status === "OPEN"
                                                                        ? "bg-emerald-500 hover:bg-emerald-500"
                                                                        : ""
                                                                }
                                                            >
                                                                {conversation.status === "OPEN"
                                                                    ? "เปิดเคส"
                                                                    : "ปิดแล้ว"}
                                                            </Badge>
                                                            <ChatTimestamp
                                                                value={conversation.lastMessageAt}
                                                                className="text-[11px] text-slate-400"
                                                            />
                                                        </div>
                                                    </div>

                                                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                                                        {conversation.lastMessagePreview || "ยังไม่มีข้อความ"}
                                                    </p>

                                                    <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                        <span className="max-w-full truncate text-xs text-slate-400">
                                                            {conversation.user.email || "ไม่มีอีเมล"}
                                                        </span>
                                                        {conversation.unreadByAdmin > 0 ? (
                                                            <span className="rounded-full bg-[#145de7] px-2 py-0.5 text-xs font-semibold text-white">
                                                                ใหม่ {conversation.unreadByAdmin}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </ScrollArea>
                </div>

                <div
                    className={`${
                        !isConversationSelected ? "hidden lg:flex" : "flex"
                    } min-h-[70dvh] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:min-h-[640px]`}
                >
                    {!selectedConversationId ? (
                        <div className="flex flex-1 items-center justify-center p-6 text-center text-muted-foreground sm:p-8">
                            เลือกบทสนทนาด้านซ้ายเพื่อดูรายละเอียดและตอบกลับลูกค้า
                        </div>
                    ) : isLoadingConversation || !selectedConversation ? (
                        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            กำลังโหลดข้อความ
                        </div>
                    ) : (
                        <>
                            <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-center gap-3">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={handleBackToList}
                                            className="shrink-0 lg:hidden"
                                            aria-label="ย้อนกลับ"
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                        </Button>

                                        <Avatar className="h-12 w-12 border border-slate-200">
                                            <AvatarImage
                                                src={selectedConversation.user.image ?? undefined}
                                                alt={selectedConversation.user.username}
                                            />
                                            <AvatarFallback>
                                                {selectedConversation.user.username.slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-900">
                                                {selectedConversation.user.name || selectedConversation.user.username}
                                            </p>
                                            <p className="truncate text-sm text-slate-500">
                                                {selectedConversation.user.email || `@${selectedConversation.user.username}`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge
                                            variant={selectedConversation.status === "OPEN" ? "default" : "secondary"}
                                            className={
                                                selectedConversation.status === "OPEN"
                                                    ? "bg-emerald-500 hover:bg-emerald-500"
                                                    : ""
                                            }
                                        >
                                            {selectedConversation.status === "OPEN"
                                                ? "กำลังคุยอยู่"
                                                : "ปิดเคสแล้ว"}
                                        </Badge>
                                        <Button variant="outline" size="sm" onClick={handleToggleStatus}>
                                            <UserRoundCheck className="mr-2 h-4 w-4" />
                                            {selectedConversation.status === "OPEN"
                                                ? "ปิดเคส"
                                                : "เปิดเคสอีกครั้ง"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleDeleteConversation}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            ลบแชท
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <ScrollArea className="flex-1 bg-slate-50/80 p-4 sm:p-5 [&_[data-slot=scroll-area-viewport]]:h-full">
                                <div className="space-y-4">
                                    {selectedConversation.messages.length === 0 ? (
                                        <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-4 text-center text-sm text-muted-foreground sm:min-h-[320px]">
                                            ลูกค้ายังไม่ได้ส่งข้อความเข้ามา
                                        </div>
                                    ) : (
                                        selectedConversation.messages.map((message) => (
                                            <MessageBubble key={message.id} message={message} />
                                        ))
                                    )}
                                    <div ref={endOfMessagesRef} />
                                </div>
                            </ScrollArea>

                            <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
                                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/gif"
                                        className="hidden"
                                        onChange={handleImageSelected}
                                    />
                                    <Textarea
                                        value={draft}
                                        onChange={(event) => setDraft(event.target.value)}
                                        onKeyDown={handleComposerKeyDown}
                                        placeholder="พิมพ์ข้อความตอบกลับลูกค้า"
                                        className="min-h-20 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 sm:min-h-24"
                                    />
                                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="space-y-2 sm:max-w-[70%]">
                                            <p className="text-xs text-slate-400">
                                                กด Enter เพื่อส่ง และกด Shift + Enter เพื่อขึ้นบรรทัดใหม่
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                รูปในแชทจะหายอัตโนมัติหลังส่งครบ 5 นาที
                                            </p>
                                        </div>

                                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading || isSending || !selectedConversationId}
                                                className="w-full rounded-full sm:w-auto"
                                            >
                                                {isUploading ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <ImagePlus className="mr-2 h-4 w-4" />
                                                )}
                                                ส่งรูป
                                            </Button>
                                            <Button
                                                onClick={handleSendMessage}
                                                disabled={isSending || isUploading || !draft.trim()}
                                                className="w-full rounded-full bg-[#145de7] px-5 hover:bg-[#0f4fc9] sm:w-auto"
                                            >
                                                {isSending ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Send className="mr-2 h-4 w-4" />
                                                )}
                                                ส่งข้อความ
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
