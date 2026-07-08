export type ChatSenderType = "CUSTOMER" | "ADMIN" | "NOTE";
export type ChatConversationStatus = "OPEN" | "CLOSED";

export interface ChatMessage {
    id: string;
    body: string;
    kind: "TEXT" | "IMAGE";
    senderType: ChatSenderType;
    createdAt: string;
    senderUserId: string | null;
    imageUrl: string | null;
    imageExpiresAt: string | null;
    isExpired: boolean;
}

export interface ChatUserSummary {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
}

export interface ChatAgent {
    id: string;
    username: string;
    name: string | null;
    role?: string;
}

export interface ChatConversationSummary {
    id: string;
    status: ChatConversationStatus;
    subject: string | null;
    isPinned: boolean;
    tags: string[];
    assigneeId: string | null;
    assignee: ChatAgent | null;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string;
    customerLastReadAt: string | null;
    adminLastReadAt: string | null;
    closedAt: string | null;
    unreadByAdmin: number;
    unreadByCustomer: number;
    lastMessagePreview: string;
    lastMessageSenderType: ChatSenderType | null;
    user: ChatUserSummary;
}

export interface ChatConversationDetail {
    id: string;
    status: ChatConversationStatus;
    subject: string | null;
    isPinned: boolean;
    tags: string[];
    assigneeId: string | null;
    assignee: ChatAgent | null;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string;
    customerLastReadAt: string | null;
    adminLastReadAt: string | null;
    closedAt: string | null;
    user: ChatUserSummary;
    messages: ChatMessage[];
    hasMoreMessages: boolean;
}

export interface QuickReplyTemplate {
    id: string;
    title: string;
    body: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ChatCustomerContext {
    user: {
        id: string;
        username: string;
        name: string | null;
        image: string | null;
        creditBalance: string;
        pointBalance: number;
        totalTopup: string;
        createdAt: string;
        lastLoginAt: string | null;
        bannedAt: string | null;
        banReason: string | null;
    };
    recentOrders: Array<{
        id: string;
        productName: string | null;
        totalPrice: string;
        status: string;
        purchasedAt: string;
    }>;
    recentTopups: Array<{
        id: string;
        amount: string;
        status: string;
        paymentMethod: string | null;
        createdAt: string;
    }>;
}

export type ConversationFilter = "all" | "open" | "closed" | "unread" | "mine";

export function getConversationStatusLabel(status: ChatConversationStatus) {
    return status === "OPEN" ? "เปิดเคส" : "ปิดเคสแล้ว";
}

export function getConversationBadgeVariant(status: ChatConversationStatus) {
    return status === "OPEN" ? ("default" as const) : ("secondary" as const);
}

export function getConversationBadgeClassName(status: ChatConversationStatus) {
    return status === "OPEN" ? "bg-emerald-500 text-white hover:bg-emerald-500" : "";
}
