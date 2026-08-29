"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
    CHAT_ALLOWED_IMAGE_TYPES,
    CHAT_MAX_IMAGE_SIZE,
} from "@/lib/chatConstraints";
import { compressImage } from "@/lib/compressImage";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { PERMISSIONS } from "@/lib/permissions";
import { showDeleteConfirm, showError, showSuccess } from "@/lib/swal";
import { refreshAdminChatUnreadNow } from "@/components/admin/chat/adminChatUnreadStore";
import type {
    ChatAgent,
    ChatConversationDetail,
    ChatConversationSummary,
    ChatMessage,
    ConversationFilter,
} from "@/components/admin/chat/types";

const LIST_POLL_INTERVAL_MS = 10_000;
const CONVERSATION_POLL_INTERVAL_MS = 5_000;
const SEARCH_DEBOUNCE_MS = 300;

function sortConversations(conversations: ChatConversationSummary[]) {
    return [...conversations].sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
            return a.isPinned ? -1 : 1;
        }

        const aUnread = a.unreadByAdmin > 0;
        const bUnread = b.unreadByAdmin > 0;

        if (aUnread !== bUnread) {
            return aUnread ? -1 : 1;
        }

        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
}

function mergeConversationPage(
    existing: ChatConversationSummary[],
    incoming: ChatConversationSummary[]
) {
    const incomingIds = new Set(incoming.map((conversation) => conversation.id));
    const rest = existing.filter((conversation) => !incomingIds.has(conversation.id));

    return [...incoming, ...rest];
}

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
    const byId = new Map(current.map((message) => [message.id, message]));

    for (const message of incoming) {
        byId.set(message.id, message);
    }

    return [...byId.values()].sort((a, b) => {
        if (a.createdAt !== b.createdAt) {
            return a.createdAt < b.createdAt ? -1 : 1;
        }

        return a.id.localeCompare(b.id);
    });
}

export function useAdminChatInbox() {
    const permissions = useAdminPermissions();
    const canManageChat = permissions.includes(PERMISSIONS.CHAT_MANAGE);

    const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [listError, setListError] = useState<string | null>(null);

    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [selectedConversation, setSelectedConversation] = useState<ChatConversationDetail | null>(null);
    const [isLoadingConversation, setIsLoadingConversation] = useState(false);
    const [conversationError, setConversationError] = useState<string | null>(null);
    const [hasMoreOlderMessages, setHasMoreOlderMessages] = useState(false);
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<ConversationFilter>("all");

    const [draft, setDraft] = useState("");
    const [isNoteMode, setIsNoteMode] = useState(false);
    const [isSending, startSending] = useTransition();
    const [isUpdatingMeta, startUpdatingMeta] = useTransition();
    const [isUploading, setIsUploading] = useState(false);

    const [agents, setAgents] = useState<ChatAgent[]>([]);
    const [myUserId, setMyUserId] = useState<string | null>(null);

    const searchQueryRef = useRef(searchQuery);

    searchQueryRef.current = searchQuery;

    const selectedConversationIdRef = useRef(selectedConversationId);

    selectedConversationIdRef.current = selectedConversationId;

    async function refreshList(options: { showLoader?: boolean; reset?: boolean } = {}) {
        if (options.showLoader) {
            setIsLoadingList(true);
        }

        try {
            const params = new URLSearchParams();
            const q = searchQueryRef.current.trim();

            if (q) {
                params.set("q", q);
            }

            const query = params.size > 0 ? `?${params.toString()}` : "";
            const response = await fetch(`/api/admin/chat/conversations${query}`, { cache: "no-store" });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message ?? "โหลดรายการแชทไม่สำเร็จ");
            }

            const incoming = (data.conversations ?? []) as ChatConversationSummary[];

            setConversations((current) =>
                options.reset ? incoming : mergeConversationPage(current, incoming)
            );

            if (options.reset) {
                setNextCursor(data.nextCursor ?? null);
            }

            setListError(null);
        } catch (error) {
            setListError(error instanceof Error ? error.message : "โหลดรายการแชทไม่สำเร็จ");
        } finally {
            if (options.showLoader) {
                setIsLoadingList(false);
            }
        }
    }

    async function loadMoreConversations() {
        if (!nextCursor || isLoadingMore) {
            return;
        }

        setIsLoadingMore(true);

        try {
            const params = new URLSearchParams({ cursor: nextCursor });
            const q = searchQueryRef.current.trim();

            if (q) {
                params.set("q", q);
            }

            const response = await fetch(`/api/admin/chat/conversations?${params.toString()}`, { cache: "no-store" });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message ?? "โหลดรายการเพิ่มเติมไม่สำเร็จ");
            }

            const incoming = (data.conversations ?? []) as ChatConversationSummary[];

            setConversations((current) => {
                const currentIds = new Set(current.map((conversation) => conversation.id));

                return [...current, ...incoming.filter((conversation) => !currentIds.has(conversation.id))];
            });
            setNextCursor(data.nextCursor ?? null);
        } catch (error) {
            showError(error instanceof Error ? error.message : "โหลดรายการเพิ่มเติมไม่สำเร็จ");
        } finally {
            setIsLoadingMore(false);
        }
    }

    function applyConversationDetail(detail: ChatConversationDetail, { mergeHistory }: { mergeHistory: boolean }) {
        setSelectedConversation((current) => {
            if (!mergeHistory) {
                return detail;
            }

            // A background update (send/upload/meta-patch/poll) for a conversation
            // the admin has since navigated away from — discard the stale response.
            if (detail.id !== selectedConversationIdRef.current) {
                return current;
            }

            if (!current || current.id !== detail.id) {
                return detail;
            }

            return {
                ...detail,
                messages: mergeMessages(current.messages, detail.messages),
            };
        });
    }

    function markConversationReadLocally(conversationId: string) {
        setConversations((current) =>
            current.map((conversation) =>
                conversation.id === conversationId ? { ...conversation, unreadByAdmin: 0 } : conversation
            )
        );
    }

    async function refreshConversation(conversationId: string, options: { showLoader?: boolean } = {}) {
        if (options.showLoader) {
            setIsLoadingConversation(true);
            setHasMoreOlderMessages(false);
        }

        try {
            const response = await fetch(`/api/admin/chat/conversations/${conversationId}`, {
                cache: "no-store",
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message ?? "โหลดบทสนทนาไม่สำเร็จ");
            }

            const detail = data.conversation as ChatConversationDetail;

            applyConversationDetail(detail, { mergeHistory: !options.showLoader });

            if (options.showLoader) {
                setHasMoreOlderMessages(detail.hasMoreMessages);
            }

            setConversationError(null);

            await fetchWithCsrf(`/api/admin/chat/conversations/${conversationId}/read`, { method: "POST" });
            markConversationReadLocally(conversationId);
            refreshAdminChatUnreadNow();
        } catch (error) {
            setConversationError(error instanceof Error ? error.message : "โหลดบทสนทนาไม่สำเร็จ");
        } finally {
            if (options.showLoader) {
                setIsLoadingConversation(false);
            }
        }
    }

    async function loadOlderMessages() {
        const conversation = selectedConversation;
        const oldestMessage = conversation?.messages[0];

        if (!conversation || !oldestMessage || isLoadingOlder) {
            return;
        }

        setIsLoadingOlder(true);

        try {
            const params = new URLSearchParams({ before: oldestMessage.id });
            const response = await fetch(
                `/api/admin/chat/conversations/${conversation.id}?${params.toString()}`,
                { cache: "no-store" }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message ?? "โหลดข้อความก่อนหน้าไม่สำเร็จ");
            }

            const detail = data.conversation as ChatConversationDetail;

            setSelectedConversation((current) =>
                current && current.id === conversation.id
                    ? { ...current, messages: mergeMessages(current.messages, detail.messages) }
                    : current
            );
            setHasMoreOlderMessages(detail.hasMoreMessages);
        } catch (error) {
            showError(error instanceof Error ? error.message : "โหลดข้อความก่อนหน้าไม่สำเร็จ");
        } finally {
            setIsLoadingOlder(false);
        }
    }

    const pollRef = useRef({ refreshList, refreshConversation });

    pollRef.current = { refreshList, refreshConversation };

    // Initial load + server-side search with debounce.
    const isFirstLoadRef = useRef(true);

    useEffect(() => {
        if (isFirstLoadRef.current) {
            isFirstLoadRef.current = false;
            pollRef.current.refreshList({ showLoader: true, reset: true }).catch(() => undefined);
            return;
        }

        const timer = window.setTimeout(() => {
            pollRef.current.refreshList({ showLoader: true, reset: true }).catch(() => undefined);
        }, SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [searchQuery]);

    // The list keeps polling even without a selected conversation so new
    // customers show up without any interaction.
    useEffect(() => {
        const interval = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                pollRef.current.refreshList({}).catch(() => undefined);
            }
        }, LIST_POLL_INTERVAL_MS);

        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!selectedConversationId) {
            return;
        }

        pollRef.current.refreshConversation(selectedConversationId, { showLoader: true }).catch(() => undefined);

        const interval = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                pollRef.current.refreshConversation(selectedConversationId, {}).catch(() => undefined);
            }
        }, CONVERSATION_POLL_INTERVAL_MS);

        return () => window.clearInterval(interval);
    }, [selectedConversationId]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const response = await fetch("/api/admin/chat/agents", { cache: "no-store" });
                const data = await response.json();

                if (!cancelled && response.ok) {
                    setAgents((data.agents ?? []) as ChatAgent[]);
                    setMyUserId(typeof data.me === "string" ? data.me : null);
                }
            } catch {
                // Assignee dropdown just stays empty; not fatal.
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const filteredConversations = useMemo(() => {
        const byFilter = conversations.filter((conversation) => {
            switch (filter) {
                case "open": {
                    return conversation.status === "OPEN";
                }
                case "closed": {
                    return conversation.status === "CLOSED";
                }
                case "unread": {
                    return conversation.unreadByAdmin > 0;
                }
                case "mine": {
                    return conversation.assigneeId !== null && conversation.assigneeId === myUserId;
                }
                default: {
                    return true;
                }
            }
        });

        return sortConversations(byFilter);
    }, [conversations, filter, myUserId]);

    // Auto-select the first conversation on large screens only.
    useEffect(() => {
        if (
            !selectedConversationId
            && filteredConversations[0]?.id
            && globalThis.window.matchMedia("(min-width: 1024px)").matches
        ) {
            setSelectedConversationId(filteredConversations[0].id);
        }
    }, [filteredConversations, selectedConversationId]);

    function selectConversation(conversationId: string) {
        if (conversationId === selectedConversationId) {
            return;
        }

        setSelectedConversation(null);
        setConversationError(null);
        setDraft("");
        setIsNoteMode(false);
        setSelectedConversationId(conversationId);
    }

    function backToList() {
        setSelectedConversationId(null);
        setSelectedConversation(null);
        setConversationError(null);
        setDraft("");
        setIsNoteMode(false);
    }

    function sendMessage() {
        if (!canManageChat) {
            showError("คุณไม่มีสิทธิ์ตอบกลับหรือจัดการแชต");
            return;
        }

        const message = draft.trim();

        if (!message || !selectedConversationId) {
            return;
        }

        const conversationId = selectedConversationId;
        const asNote = isNoteMode;

        startSending(async () => {
            try {
                const response = await fetchWithCsrf(`/api/admin/chat/conversations/${conversationId}/messages`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ message, isNote: asNote }),
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message ?? "ส่งข้อความไม่สำเร็จ");
                }

                setDraft("");
                applyConversationDetail(data.conversation as ChatConversationDetail, { mergeHistory: true });
                await refreshList({});
            } catch (error) {
                showError(error instanceof Error ? error.message : "ส่งข้อความไม่สำเร็จ");
            }
        });
    }

    async function handleImageSelected(event: ChangeEvent<HTMLInputElement>) {
        if (!canManageChat) {
            showError("คุณไม่มีสิทธิ์ส่งรูปในแชต");
            event.target.value = "";
            return;
        }

        const originalFile = event.target.files?.[0];

        if (!originalFile || !selectedConversationId) {
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

            const response = await fetchWithCsrf(`/api/admin/chat/conversations/${selectedConversationId}/images`, {
                method: "POST",
                body: formData,
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message ?? "ส่งรูปภาพไม่สำเร็จ");
            }

            applyConversationDetail(data.conversation as ChatConversationDetail, { mergeHistory: true });
            await refreshList({});
        } catch (error) {
            showError(error instanceof Error ? error.message : "ส่งรูปภาพไม่สำเร็จ");
        } finally {
            event.target.value = "";
            setIsUploading(false);
        }
    }

    function updateConversationMeta(
        patch: Partial<{ isPinned: boolean; tags: string[]; assigneeId: string | null; status: "OPEN" | "CLOSED" }>,
        successMessage?: string
    ) {
        if (!canManageChat) {
            showError("คุณไม่มีสิทธิ์จัดการแชต");
            return;
        }

        const conversation = selectedConversation;

        if (!conversation) {
            return;
        }

        startUpdatingMeta(async () => {
            try {
                const response = await fetchWithCsrf(`/api/admin/chat/conversations/${conversation.id}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(patch),
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message ?? "อัปเดตข้อมูลแชตไม่สำเร็จ");
                }

                applyConversationDetail(data.conversation as ChatConversationDetail, { mergeHistory: true });
                await refreshList({});

                if (successMessage) {
                    showSuccess(successMessage);
                }
            } catch (error) {
                showError(error instanceof Error ? error.message : "อัปเดตข้อมูลแชตไม่สำเร็จ");
            }
        });
    }

    function togglePin() {
        if (!selectedConversation) {
            return;
        }

        updateConversationMeta({ isPinned: !selectedConversation.isPinned });
    }

    function toggleTag(tag: string) {
        if (!selectedConversation) {
            return;
        }

        const hasTag = selectedConversation.tags.includes(tag);
        const nextTags = hasTag
            ? selectedConversation.tags.filter((item) => item !== tag)
            : [...selectedConversation.tags, tag];

        updateConversationMeta({ tags: nextTags });
    }

    function toggleStatus() {
        if (!selectedConversation) {
            return;
        }

        const nextStatus = selectedConversation.status === "OPEN" ? "CLOSED" : "OPEN";

        updateConversationMeta(
            { status: nextStatus },
            nextStatus === "CLOSED" ? "ปิดเคสแชทแล้ว" : "เปิดเคสแชทแล้ว"
        );
    }

    function assignConversation(assigneeId: string | null) {
        updateConversationMeta({ assigneeId });
    }

    async function deleteSelectedConversation() {
        if (!canManageChat) {
            showError("คุณไม่มีสิทธิ์ลบแชต");
            return;
        }

        const conversation = selectedConversation;

        if (!conversation) {
            return;
        }

        const confirmed = await showDeleteConfirm(conversation.user.name || conversation.user.username);

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetchWithCsrf(`/api/admin/chat/conversations/${conversation.id}`, {
                method: "DELETE",
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message ?? "ลบห้องแชทไม่สำเร็จ");
            }

            backToList();
            setConversations((current) => current.filter((item) => item.id !== conversation.id));
            showSuccess("ลบห้องแชทแล้ว");
        } catch (error) {
            showError(error instanceof Error ? error.message : "ลบห้องแชทไม่สำเร็จ");
        }
    }

    return {
        canManageChat,
        conversations: filteredConversations,
        totalLoadedConversations: conversations.length,
        nextCursor,
        isLoadingList,
        isLoadingMore,
        listError,
        selectedConversationId,
        selectedConversation,
        isLoadingConversation,
        conversationError,
        hasMoreOlderMessages,
        isLoadingOlder,
        searchQuery,
        setSearchQuery,
        filter,
        setFilter,
        draft,
        setDraft,
        isNoteMode,
        setIsNoteMode,
        isSending,
        isUploading,
        isUpdatingMeta,
        agents,
        myUserId,
        selectConversation,
        backToList,
        sendMessage,
        handleImageSelected,
        togglePin,
        toggleTag,
        toggleStatus,
        assignConversation,
        deleteSelectedConversation,
        loadMoreConversations,
        loadOlderMessages,
        refreshList,
        refreshSelectedConversation: () => {
            if (selectedConversationId) {
                void refreshConversation(selectedConversationId, { showLoader: true });
            }
        },
    };
}
