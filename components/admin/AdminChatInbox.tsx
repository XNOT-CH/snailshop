"use client";

import { useState, useSyncExternalStore } from "react";
import { BellRing, Loader2, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ChatComposer } from "@/components/admin/chat/ChatComposer";
import { ChatThread } from "@/components/admin/chat/ChatThread";
import { ChatThreadHeader } from "@/components/admin/chat/ChatThreadHeader";
import { ConversationList } from "@/components/admin/chat/ConversationList";
import { CustomerContextPanel } from "@/components/admin/chat/CustomerContextPanel";
import { useAdminChatInbox } from "@/components/admin/chat/useAdminChatInbox";
import {
    isChatNotifyEnabled,
    setChatNotifyEnabled,
} from "@/components/admin/chat/adminChatUnreadStore";

function NotifyToggle() {
    // Hydration-safe read of the localStorage preference (SSR renders "off").
    const mounted = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );
    const [override, setOverride] = useState<boolean | null>(null);
    const enabled = override ?? (mounted && isChatNotifyEnabled());

    async function handleChange(next: boolean) {
        if (next && typeof Notification !== "undefined" && Notification.permission === "default") {
            await Notification.requestPermission().catch(() => undefined);
        }

        setOverride(next);
        setChatNotifyEnabled(next);
    }

    return (
        <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <BellRing className="h-3.5 w-3.5" />
            แจ้งเตือนข้อความใหม่
            <Switch
                checked={enabled}
                onCheckedChange={(checked) => void handleChange(checked)}
                aria-label="เปิดปิดเสียงและการแจ้งเตือนข้อความใหม่"
            />
        </label>
    );
}

export default function AdminChatInbox() {
    const inbox = useAdminChatInbox();
    const [isInfoSheetOpen, setIsInfoSheetOpen] = useState(false);

    const isConversationSelected = Boolean(inbox.selectedConversationId);

    let detailContent: React.ReactNode;

    if (!inbox.selectedConversationId) {
        detailContent = (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-muted-foreground sm:p-8">
                เลือกบทสนทนาด้านซ้ายเพื่อดูรายละเอียดและตอบกลับลูกค้า
            </div>
        );
    } else if (inbox.conversationError && !inbox.selectedConversation) {
        detailContent = (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-destructive">
                <p>{inbox.conversationError}</p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={inbox.refreshSelectedConversation}
                >
                    ลองใหม่
                </Button>
            </div>
        );
    } else if (inbox.isLoadingConversation || !inbox.selectedConversation) {
        detailContent = (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังโหลดข้อความ
            </div>
        );
    } else {
        detailContent = (
            <>
                <ChatThreadHeader
                    conversation={inbox.selectedConversation}
                    canManage={inbox.canManageChat}
                    isUpdatingMeta={inbox.isUpdatingMeta}
                    agents={inbox.agents}
                    onBack={inbox.backToList}
                    onTogglePin={inbox.togglePin}
                    onToggleStatus={inbox.toggleStatus}
                    onToggleTag={inbox.toggleTag}
                    onAssign={inbox.assignConversation}
                    onDelete={() => void inbox.deleteSelectedConversation()}
                    onOpenCustomerInfo={() => setIsInfoSheetOpen(true)}
                />
                <ChatThread
                    conversation={inbox.selectedConversation}
                    hasMoreOlderMessages={inbox.hasMoreOlderMessages}
                    isLoadingOlder={inbox.isLoadingOlder}
                    onLoadOlder={() => void inbox.loadOlderMessages()}
                />
                <ChatComposer
                    draft={inbox.draft}
                    onDraftChange={inbox.setDraft}
                    isNoteMode={inbox.isNoteMode}
                    onNoteModeChange={inbox.setIsNoteMode}
                    canManage={inbox.canManageChat}
                    isSending={inbox.isSending}
                    isUploading={inbox.isUploading}
                    onSend={inbox.sendMessage}
                    onImageSelected={(event) => void inbox.handleImageSelected(event)}
                />
            </>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                        <MessageSquareText className="h-6 w-6 text-primary" />
                        กล่องข้อความลูกค้า
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        ตอบลูกค้าแบบต่อเนื่องจากหน้าเว็บ พร้อมข้อมูลลูกค้า เทมเพลตข้อความ และการแจ้งเตือนในที่เดียว
                    </p>
                </div>

                <NotifyToggle />
            </div>

            <div className="grid gap-4 lg:h-[calc(100dvh-14rem)] lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_320px]">
                <ConversationList
                    className={isConversationSelected ? "hidden lg:flex" : "flex flex-col"}
                    conversations={inbox.conversations}
                    isLoading={inbox.isLoadingList}
                    error={inbox.listError}
                    onRetry={() => void inbox.refreshList({ showLoader: true, reset: true })}
                    searchQuery={inbox.searchQuery}
                    onSearchChange={inbox.setSearchQuery}
                    filter={inbox.filter}
                    onFilterChange={inbox.setFilter}
                    selectedConversationId={inbox.selectedConversationId}
                    onSelect={inbox.selectConversation}
                    nextCursor={inbox.nextCursor}
                    isLoadingMore={inbox.isLoadingMore}
                    onLoadMore={() => void inbox.loadMoreConversations()}
                />

                <div
                    className={cn(
                        "min-h-[70dvh] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm lg:h-full lg:min-h-0",
                        isConversationSelected ? "flex" : "hidden lg:flex"
                    )}
                >
                    {detailContent}
                </div>

                <div className="hidden overflow-hidden rounded-3xl border border-border bg-card shadow-sm xl:flex xl:h-full xl:min-h-0 xl:flex-col">
                    <div className="border-b border-border px-4 py-4">
                        <p className="text-sm font-semibold text-foreground">ข้อมูลลูกค้า</p>
                    </div>
                    <CustomerContextPanel
                        conversationId={inbox.selectedConversationId}
                        className="flex-1"
                    />
                </div>
            </div>

            <Sheet open={isInfoSheetOpen} onOpenChange={setIsInfoSheetOpen}>
                <SheetContent side="right" className="w-[min(22rem,92vw)] p-0">
                    <SheetHeader className="border-b border-border px-4 py-4">
                        <SheetTitle className="text-sm font-semibold">ข้อมูลลูกค้า</SheetTitle>
                    </SheetHeader>
                    <CustomerContextPanel
                        conversationId={isInfoSheetOpen ? inbox.selectedConversationId : null}
                        className="h-[calc(100%-3.75rem)]"
                    />
                </SheetContent>
            </Sheet>
        </div>
    );
}
