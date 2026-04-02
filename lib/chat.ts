import { and, eq, gt, sql } from "drizzle-orm";
import { db, chatConversations, chatMessages, users } from "@/lib/db";
import { deleteChatImageFile } from "@/lib/chatMedia";
import { ChatMessageKind, parseChatImagePayload, parseChatMessageContent } from "@/lib/chatMessageContent";
import { mysqlDateTimeToIso, mysqlNow } from "@/lib/utils/date";

export type ChatSenderType = "CUSTOMER" | "ADMIN";
export type ChatConversationStatus = "OPEN" | "CLOSED";

export interface ChatMessageDto {
    id: string;
    body: string;
    kind: ChatMessageKind;
    senderType: ChatSenderType;
    createdAt: string;
    senderUserId: string | null;
    imageUrl: string | null;
    imageExpiresAt: string | null;
    isExpired: boolean;
}

export interface ChatConversationDto {
    id: string;
    status: ChatConversationStatus;
    subject: string | null;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string;
    customerLastReadAt: string | null;
    adminLastReadAt: string | null;
    closedAt: string | null;
    user: {
        id: string;
        username: string;
        name: string | null;
        image: string | null;
        email: string | null;
    };
    messages: ChatMessageDto[];
}

export interface ChatConversationSummaryDto {
    id: string;
    status: ChatConversationStatus;
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
    lastMessageSenderType: ChatSenderType | null;
    user: ChatConversationDto["user"];
}

interface ChatConversationSummaryRecord {
    id: string;
    status: string;
    subject: string | null;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string;
    customerLastReadAt: string | null;
    adminLastReadAt: string | null;
    closedAt: string | null;
    user: ChatConversationDto["user"];
    messages: Array<{
        id: string;
        body: string;
        senderType: string;
        createdAt: string;
        senderUserId: string | null;
    }>;
}

interface ChatConversationRecord {
    id: string;
    userId: string;
    status: string;
    subject: string | null;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string;
    customerLastReadAt: string | null;
    adminLastReadAt: string | null;
    closedAt: string | null;
}

function trimMessageBody(body: string) {
    return body.trim().replace(/\s+\n/g, "\n").slice(0, 2000);
}

function serializeMessage(message: {
    id: string;
    body: string;
    senderType: string;
    createdAt: string;
    senderUserId: string | null;
}): ChatMessageDto {
    const content = parseChatMessageContent({
        messageId: message.id,
        body: message.body,
    });

    if (content.kind === "IMAGE" && content.isExpired) {
        void deleteChatImageFile(content.storedName);
    }

    return {
        id: message.id,
        body: content.body,
        kind: content.kind,
        senderType: message.senderType as ChatSenderType,
        createdAt: mysqlDateTimeToIso(message.createdAt) ?? message.createdAt,
        senderUserId: message.senderUserId,
        imageUrl: content.imageUrl,
        imageExpiresAt: content.imageExpiresAt,
        isExpired: content.isExpired,
    };
}

function serializeConversationTimestamps(conversation: ChatConversationRecord) {
    return {
        createdAt: mysqlDateTimeToIso(conversation.createdAt) ?? conversation.createdAt,
        updatedAt: mysqlDateTimeToIso(conversation.updatedAt) ?? conversation.updatedAt,
        lastMessageAt: mysqlDateTimeToIso(conversation.lastMessageAt) ?? conversation.lastMessageAt,
        customerLastReadAt: mysqlDateTimeToIso(conversation.customerLastReadAt),
        adminLastReadAt: mysqlDateTimeToIso(conversation.adminLastReadAt),
        closedAt: mysqlDateTimeToIso(conversation.closedAt),
    };
}

async function countUnreadMessages(
    conversationId: string,
    senderType: ChatSenderType,
    lastReadAt: string | null
) {
    const conditions = [
        eq(chatMessages.conversationId, conversationId),
        eq(chatMessages.senderType, senderType),
    ];

    if (lastReadAt) {
        conditions.push(gt(chatMessages.createdAt, lastReadAt));
    }

    const [result] = await db
        .select({
            count: sql<number>`count(*)`,
        })
        .from(chatMessages)
        .where(and(...conditions));

    return Number(result?.count ?? 0);
}

async function enrichConversationSummary(conversation: ChatConversationSummaryRecord): Promise<ChatConversationSummaryDto> {
    const [unreadByAdmin, unreadByCustomer] = await Promise.all([
        countUnreadMessages(conversation.id, "CUSTOMER", conversation.adminLastReadAt),
        countUnreadMessages(conversation.id, "ADMIN", conversation.customerLastReadAt),
    ]);

    const latestMessage = conversation.messages[0];
    const timestamps = serializeConversationTimestamps(conversation);

    return {
        id: conversation.id,
        status: conversation.status as ChatConversationStatus,
        subject: conversation.subject,
        createdAt: timestamps.createdAt,
        updatedAt: timestamps.updatedAt,
        lastMessageAt: timestamps.lastMessageAt,
        customerLastReadAt: timestamps.customerLastReadAt,
        adminLastReadAt: timestamps.adminLastReadAt,
        closedAt: timestamps.closedAt,
        unreadByAdmin,
        unreadByCustomer,
        lastMessagePreview: latestMessage
            ? parseChatMessageContent({
                messageId: latestMessage.id,
                body: latestMessage.body,
            }).previewText
            : "",
        lastMessageSenderType: (latestMessage?.senderType as ChatSenderType | undefined) ?? null,
        user: {
            id: conversation.user.id,
            username: conversation.user.username,
            name: conversation.user.name,
            image: conversation.user.image,
            email: conversation.user.email,
        },
    };
}

async function getChatUser(userId: string) {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
            id: true,
            username: true,
            name: true,
            image: true,
            email: true,
        },
    });

    if (!user) {
        throw new Error(`Chat user not found: ${userId}`);
    }

    return user;
}

async function getConversationMessages(conversationId: string) {
    return db.query.chatMessages.findMany({
        where: eq(chatMessages.conversationId, conversationId),
        orderBy: (t, { asc }) => asc(t.createdAt),
        columns: {
            id: true,
            body: true,
            senderType: true,
            createdAt: true,
            senderUserId: true,
        },
    });
}

async function hydrateConversation(conversation: ChatConversationRecord): Promise<ChatConversationDto> {
    const [user, messages] = await Promise.all([
        getChatUser(conversation.userId),
        getConversationMessages(conversation.id),
    ]);
    const timestamps = serializeConversationTimestamps(conversation);

    return {
        id: conversation.id,
        status: conversation.status as ChatConversationStatus,
        subject: conversation.subject,
        createdAt: timestamps.createdAt,
        updatedAt: timestamps.updatedAt,
        lastMessageAt: timestamps.lastMessageAt,
        customerLastReadAt: timestamps.customerLastReadAt,
        adminLastReadAt: timestamps.adminLastReadAt,
        closedAt: timestamps.closedAt,
        user: {
            id: user.id,
            username: user.username,
            name: user.name,
            image: user.image,
            email: user.email,
        },
        messages: messages.map(serializeMessage),
    };
}

export async function getOrCreateUserConversation(userId: string) {
    const existingConversation = await db.query.chatConversations.findFirst({
        where: eq(chatConversations.userId, userId),
        orderBy: (t, { desc: orderDesc }) => orderDesc(t.lastMessageAt),
    });

    if (existingConversation) {
        return existingConversation;
    }

    const now = mysqlNow();

    await db.insert(chatConversations).values({
        userId,
        status: "OPEN",
        customerLastReadAt: now,
        adminLastReadAt: null,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
    });

    const createdConversation = await db.query.chatConversations.findFirst({
        where: eq(chatConversations.userId, userId),
        orderBy: (t, { desc: orderDesc }) => orderDesc(t.createdAt),
    });

    if (!createdConversation) {
        throw new Error("Failed to create conversation");
    }

    return createdConversation;
}

export async function getUserConversation(userId: string): Promise<ChatConversationDto> {
    const conversation = await getOrCreateUserConversation(userId);
    const hydratedConversation = await db.query.chatConversations.findFirst({
        where: eq(chatConversations.id, conversation.id),
    });

    if (!hydratedConversation) {
        throw new Error("Conversation not found");
    }

    return hydrateConversation(hydratedConversation);
}

export async function listAdminConversations(): Promise<ChatConversationSummaryDto[]> {
    const conversations = await db.query.chatConversations.findMany({
        orderBy: (t, { desc: orderDesc }) => orderDesc(t.lastMessageAt),
    });

    return Promise.all(conversations.map(async (conversation) => {
        const [user, latestMessages] = await Promise.all([
            getChatUser(conversation.userId),
            db.query.chatMessages.findMany({
                where: eq(chatMessages.conversationId, conversation.id),
                orderBy: (t, { desc: orderDesc }) => orderDesc(t.createdAt),
                limit: 1,
                columns: {
                    id: true,
                    body: true,
                    senderType: true,
                    createdAt: true,
                    senderUserId: true,
                },
            }),
        ]);

        return enrichConversationSummary({
            ...conversation,
            user,
            messages: latestMessages,
        });
    }));
}

export async function getAdminConversation(conversationId: string): Promise<ChatConversationDto | null> {
    const conversation = await db.query.chatConversations.findFirst({
        where: eq(chatConversations.id, conversationId),
    });

    if (!conversation) {
        return null;
    }

    return hydrateConversation(conversation);
}

export async function sendConversationMessage(params: {
    userId: string;
    senderType: ChatSenderType;
    body: string;
    conversationId?: string;
}) {
    const sanitizedBody = trimMessageBody(params.body);

    if (!sanitizedBody) {
        throw new Error("Message cannot be empty");
    }

    const now = mysqlNow();

    const conversation = params.conversationId
        ? await db.query.chatConversations.findFirst({
            where: eq(chatConversations.id, params.conversationId),
        })
        : await getOrCreateUserConversation(params.userId);

    if (!conversation) {
        throw new Error("Conversation not found");
    }

    await db.transaction(async (tx) => {
        await tx.insert(chatMessages).values({
            conversationId: conversation.id,
            senderType: params.senderType,
            senderUserId: params.userId,
            body: sanitizedBody,
            createdAt: now,
        });

        await tx.update(chatConversations).set({
            status: "OPEN",
            closedAt: null,
            lastMessageAt: now,
            customerLastReadAt: params.senderType === "CUSTOMER" ? now : conversation.customerLastReadAt,
            adminLastReadAt: params.senderType === "ADMIN" ? now : conversation.adminLastReadAt,
        }).where(eq(chatConversations.id, conversation.id));
    });

    return conversation.id;
}

export async function markConversationRead(conversationId: string, actor: ChatSenderType) {
    const now = mysqlNow();

    await db.update(chatConversations).set(
        actor === "ADMIN"
            ? { adminLastReadAt: now }
            : { customerLastReadAt: now }
    ).where(eq(chatConversations.id, conversationId));
}

export async function updateConversationStatus(conversationId: string, status: ChatConversationStatus) {
    await db.update(chatConversations).set({
        status,
        closedAt: status === "CLOSED" ? mysqlNow() : null,
    }).where(eq(chatConversations.id, conversationId));
}

export async function getConversationMessage(messageId: string) {
    return db.query.chatMessages.findFirst({
        where: eq(chatMessages.id, messageId),
        columns: {
            id: true,
            conversationId: true,
            body: true,
            senderType: true,
            createdAt: true,
            senderUserId: true,
        },
    });
}

export async function cleanupExpiredChatImages() {
    const messages = await db.query.chatMessages.findMany({
        columns: {
            body: true,
        },
    });

    const expiredStoredNames = new Set<string>();
    const now = Date.now();

    for (const message of messages) {
        const payload = parseChatImagePayload(message.body);

        if (!payload) {
            continue;
        }

        if (new Date(payload.expiresAt).getTime() <= now) {
            expiredStoredNames.add(payload.storedName);
        }
    }

    await Promise.all(
        [...expiredStoredNames].map((storedName) => deleteChatImageFile(storedName))
    );

    return {
        deletedFiles: expiredStoredNames.size,
    };
}

export async function deleteConversation(conversationId: string) {
    const messages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.conversationId, conversationId),
        columns: {
            body: true,
        },
    });

    await Promise.all(
        messages.map((message) => deleteChatImageFile(parseChatImagePayload(message.body)?.storedName))
    );

    await db.delete(chatConversations).where(eq(chatConversations.id, conversationId));
}
