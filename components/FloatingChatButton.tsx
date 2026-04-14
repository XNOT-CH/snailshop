"use client";

import Link from "next/link";
import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { ImagePlus, Loader2, LockKeyhole, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatBrandLogo } from "@/components/chat/ChatBrandLogo";
import { ChatMessageContent } from "@/components/chat/ChatMessageContent";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
    CHAT_ALLOWED_IMAGE_TYPES,
    CHAT_IMAGE_ACCEPT_ATTRIBUTE,
    CHAT_MAX_IMAGE_SIZE,
    CHAT_MAX_MESSAGE_LENGTH,
} from "@/lib/chatConstraints";
import { compressImage } from "@/lib/compressImage";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { showError } from "@/lib/swal";

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

interface ChatConversation {
    id: string;
    status: "OPEN" | "CLOSED";
    adminLastReadAt: string | null;
    messages: ChatMessage[];
}

const HIDDEN_PATH_PREFIXES = ["/login", "/register", "/admin"];

function isMessageReadByAdmin(message: ChatMessage, adminLastReadAt: string | null) {
    if (!adminLastReadAt) {
        return false;
    }

    return new Date(adminLastReadAt).getTime() >= new Date(message.createdAt).getTime();
}

function ChatBubble({
    message,
    statusLabel,
}: Readonly<{
    message: ChatMessage;
    statusLabel?: string | null;
}>) {
    const isCustomer = message.senderType === "CUSTOMER";

    return (
        <div className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-[90%] rounded-[24px] px-3.5 py-3 text-sm shadow-sm sm:max-w-[85%] sm:rounded-[28px] sm:px-4 ${
                    isCustomer
                        ? "bg-[#1185f7] text-white"
                        : "border border-slate-200 bg-white text-slate-900"
                }`}
            >
                <ChatMessageContent
                    message={message}
                    tone={isCustomer ? "primary" : "neutral"}
                    statusLabel={isCustomer ? statusLabel : null}
                />
            </div>
        </div>
    );
}

export function FloatingChatButton() {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [conversation, setConversation] = useState<ChatConversation | null>(null);
    const [draft, setDraft] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isSending, startSending] = useTransition();
    const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const latestCustomerMessageId = [...(conversation?.messages ?? [])]
        .reverse()
        .find((message) => message.senderType === "CUSTOMER")?.id;

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        void loadConversation();

        const interval = window.setInterval(() => {
            void loadConversation(false);
        }, 5000);

        return () => window.clearInterval(interval);
    }, [isOpen]);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [conversation]);

    if (!isMounted || HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        return null;
    }

    async function loadConversation(showLoader = true) {
        if (showLoader) {
            setIsLoading(true);
        }

        try {
            const response = await fetch("/api/chat/conversation", { cache: "no-store" });
            const data = await response.json();

            if (response.status === 401) {
                setIsAuthenticated(false);
                setConversation(null);
                return;
            }

            if (!response.ok) {
                throw new Error(data.message ?? "Failed to load conversation");
            }

            setIsAuthenticated(true);
            setConversation(data.conversation);
            await fetchWithCsrf("/api/chat/read", { method: "POST" });
        } catch (error) {
            showError(error instanceof Error ? error.message : "โหลดข้อความไม่สำเร็จ");
        } finally {
            if (showLoader) {
                setIsLoading(false);
            }
        }
    }

    function handleSendMessage() {
        const message = draft.trim();

        if (!message) {
            return;
        }

        startSending(async () => {
            try {
                const response = await fetchWithCsrf("/api/chat/messages", {
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
                setConversation(data.conversation);
            } catch (error) {
                showError(error instanceof Error ? error.message : "ส่งข้อความไม่สำเร็จ");
            }
        });
    }

    async function handleImageSelected(event: ChangeEvent<HTMLInputElement>) {
        const originalFile = event.target.files?.[0];

        if (!originalFile) {
            return;
        }

        setIsUploading(true);

        try {
            if (!CHAT_ALLOWED_IMAGE_TYPES.includes(originalFile.type as (typeof CHAT_ALLOWED_IMAGE_TYPES)[number])) {
                throw new Error("รองรับเฉพาะไฟล์ JPG, PNG, WebP และ GIF");
            }

            const fileToUpload =
                originalFile.type === "image/gif"
                    ? originalFile
                    : await compressImage(originalFile, 500 * 1024);

            if (fileToUpload.size === 0) {
                throw new Error("ไฟล์รูปว่างเปล่า กรุณาเลือกไฟล์ใหม่");
            }

            if (fileToUpload.size > CHAT_MAX_IMAGE_SIZE) {
                throw new Error("ไฟล์รูปต้องมีขนาดไม่เกิน 3MB");
            }

            const formData = new FormData();

            formData.append("file", fileToUpload, fileToUpload.name);

            const response = await fetchWithCsrf("/api/chat/images", {
                method: "POST",
                body: formData,
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message ?? "Failed to upload image");
            }

            setConversation(data.conversation);
        } catch (error) {
            showError(error instanceof Error ? error.message : "ส่งรูปภาพไม่สำเร็จ");
        } finally {
            event.target.value = "";
            setIsUploading(false);
        }
    }

    function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    }

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <button
                    type="button"
                    className="fixed bottom-4 right-4 z-50 flex h-[76px] w-[76px] items-center justify-center rounded-[24px] bg-transparent shadow-none ring-0 transition hover:scale-105 sm:bottom-6 sm:right-6 sm:h-[84px] sm:w-[84px]"
                    aria-label="เปิดแชทลูกค้า"
                >
                    <ChatBrandLogo
                        className="h-full w-full rounded-[24px] shadow-none"
                    />
                </button>
            </SheetTrigger>

            <SheetContent
                side="right"
                className="h-[100dvh] w-full gap-0 overflow-hidden border-l-0 bg-[#f5f7fb] p-0 sm:inset-y-4 sm:right-4 sm:h-auto sm:w-[min(420px,calc(100vw-2rem))] sm:max-w-none sm:rounded-[32px] sm:border sm:border-slate-200"
            >
                <SheetHeader className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 pr-12 text-left sm:px-5 sm:pr-14">
                    <div className="flex items-center gap-3.5">
                        <ChatBrandLogo className="h-14 w-14 rounded-[1.35rem] sm:h-[3.75rem] sm:w-[3.75rem]" />
                        <div className="min-w-0 flex-1 py-0.5">
                            <SheetTitle className="truncate pb-0.5 text-lg font-black leading-[1.15] text-slate-900">คุยกับทีมร้าน</SheetTitle>
                            <SheetDescription className="mt-1 text-xs text-slate-500">
                                ถามเรื่องสินค้า ออเดอร์ หรือปัญหาการใช้งานได้เลย
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                {!isAuthenticated ? (
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 text-center sm:px-6">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                            <LockKeyhole className="h-7 w-7" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">ล็อกอินก่อนเริ่มแชท</h3>
                        <p className="mt-2 text-sm text-slate-500">
                            ระบบจะผูกประวัติแชทกับบัญชีของคุณ เพื่อให้ทีมงานช่วยติดตามได้ต่อเนื่อง
                        </p>
                        <Button asChild className="mt-5 rounded-full bg-[#1185f7] px-5 hover:bg-[#0f5ed7]">
                            <Link href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}>
                                เข้าสู่ระบบเพื่อเริ่มคุย
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="flex min-h-0 flex-1 flex-col">
                        <div className="shrink-0 border-b border-slate-200 bg-white/80 px-4 py-3 text-xs text-slate-500 sm:px-5">
                            {conversation?.status === "CLOSED" ? (
                                <p className="text-amber-600">
                                    เคสนี้ถูกปิดไว้แล้ว แต่คุณยังส่งข้อความใหม่เพื่อเปิดเคสต่อได้
                                </p>
                            ) : null}
                        </div>

                        <ScrollArea className="relative min-h-0 flex-1 p-3 sm:p-4">
                            {/* Watermark */}
                            <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
                                <img
                                    src="/chat-snail.png"
                                    alt=""
                                    className="h-40 w-40 object-contain opacity-[0.07] sm:h-48 sm:w-48"
                                    draggable={false}
                                />
                            </div>

                            <div className="relative z-10 space-y-4">
                                {isLoading ? (
                                    <div className="flex min-h-[280px] items-center justify-center text-sm text-slate-500">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        กำลังโหลดข้อความ
                                    </div>
                                ) : conversation?.messages.length ? (
                                    conversation.messages.map((message) => {
                                        const statusLabel = message.id === latestCustomerMessageId
                                            ? (
                                                isMessageReadByAdmin(message, conversation.adminLastReadAt)
                                                    ? "อ่านแล้ว"
                                                    : "ส่งแล้ว"
                                            )
                                            : null;

                                        return (
                                            <ChatBubble
                                                key={message.id}
                                                message={message}
                                                statusLabel={statusLabel}
                                            />
                                        );
                                    })
                                ) : (
                                    <div className="flex min-h-[280px] items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white px-4 text-center text-sm text-slate-500">
                                        เริ่มพิมพ์ข้อความแรกเพื่อคุยกับทีมร้านได้เลย
                                    </div>
                                )}
                                <div ref={endOfMessagesRef} />
                            </div>
                        </ScrollArea>

                        <div className="shrink-0 border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
                            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-2.5 sm:rounded-[28px] sm:p-3">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={CHAT_IMAGE_ACCEPT_ATTRIBUTE}
                                    className="hidden"
                                    onChange={handleImageSelected}
                                />
                                <Textarea
                                    value={draft}
                                    onChange={(event) => setDraft(event.target.value)}
                                    onKeyDown={handleComposerKeyDown}
                                    placeholder="พิมพ์ข้อความของคุณ"
                                    maxLength={CHAT_MAX_MESSAGE_LENGTH}
                                    className="min-h-20 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 sm:min-h-24"
                                />
                                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-2">
                                        <p className="text-xs text-slate-400">
                                            ทีมงานจะตอบกลับทันทีเมื่อมีแอดมินออนไลน์
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            รูปจะหายอัตโนมัติหลังส่งครบ 5 นาที
                                        </p>
                                    </div>

                                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading || isSending}
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
                                            className="w-full rounded-full bg-[#1185f7] px-5 hover:bg-[#0f5ed7] sm:w-auto"
                                        >
                                            {isSending ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Send className="mr-2 h-4 w-4" />
                                            )}
                                            ส่ง
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
