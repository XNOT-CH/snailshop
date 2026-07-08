import { and, desc, eq, getTableColumns, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { db, chatConversations, chatMessages, orders, topups, users } from "@/lib/db";
import { deleteChatImageFile } from "@/lib/chatMedia";
import { sanitizeChatTags } from "@/lib/chatAdmin";
import { parseChatMessagePayload } from "@/lib/chatSecurity";
import { ChatMessageKind, parseChatImagePayload, parseChatMessageContent } from "@/lib/chatMessageContent";
import { mysqlDateTimeToIso, mysqlNow } from "@/lib/utils/date";

// NOTE = internal admin note; never visible to the customer and never bumps
// lastMessageAt/unread counters, so every query that feeds the customer or a
// preview/unread computation must exclude it.
export type ChatSenderType = "CUSTOMER" | "ADMIN" | "NOTE";
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

export interface ChatUserSummary {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
}

export interface ChatAssigneeSummary {
    id: string;
    username: string;
    name: string | null;
}

export interface ChatConversationDto {
    id: string;
    status: ChatConversationStatus;
    subject: string | null;
    isPinned: boolean;
    tags: string[];
    assigneeId: string | null;
    assignee: ChatAssigneeSummary | null;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string;
    customerLastReadAt: string | null;
    adminLastReadAt: string | null;
    closedAt: string | null;
    user: ChatUserSummary;
    messages: ChatMessageDto[];
    hasMoreMessages: boolean;
}

export interface ChatConversationSummaryDto {
    id: string;
    status: ChatConversationStatus;
    subject: string | null;
    isPinned: boolean;
    tags: string[];
    assigneeId: string | null;
    assignee: ChatAssigneeSummary | null;
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

interface ChatConversationRecord {
    id: string;
    userId: string;
    status: string;
    subject: string | null;
    isPinned: boolean;
    tags: string[];
    assigneeId: string | null;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string;
    customerLastReadAt: string | null;
    adminLastReadAt: string | null;
    closedAt: string | null;
}

const ADMIN_MESSAGES_PAGE_SIZE = 50;
const CONVERSATION_LIST_PAGE_SIZE = 30;

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

function serializeConversationTimestamps(conversation: Pick<
    ChatConversationRecord,
    "createdAt" | "updatedAt" | "lastMessageAt" | "customerLastReadAt" | "adminLastReadAt" | "closedAt"
>) {
    return {
        createdAt: mysqlDateTimeToIso(conversation.createdAt) ?? conversation.createdAt,
        updatedAt: mysqlDateTimeToIso(conversation.updatedAt) ?? conversation.updatedAt,
        lastMessageAt: mysqlDateTimeToIso(conversation.lastMessageAt) ?? conversation.lastMessageAt,
        customerLastReadAt: mysqlDateTimeToIso(conversation.customerLastReadAt),
        adminLastReadAt: mysqlDateTimeToIso(conversation.adminLastReadAt),
        closedAt: mysqlDateTimeToIso(conversation.closedAt),
    };
}

async function getChatUser(userId: string): Promise<ChatUserSummary> {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
            id: true,
            username: true,
            name: true,
            image: true,
        },
    });

    if (!user) {
        throw new Error(`Chat user not found: ${userId}`);
    }

    return user;
}

async function getChatAssignee(assigneeId: string | null): Promise<ChatAssigneeSummary | null> {
    if (!assigneeId) {
        return null;
    }

    const assignee = await db.query.users.findFirst({
        where: eq(users.id, assigneeId),
        columns: {
            id: true,
            username: true,
            name: true,
        },
    });

    return assignee ?? null;
}

interface MessagesWindowOptions {
    includeNotes: boolean;
    beforeMessageId?: string | null;
    limit?: number | null;
}

async function getConversationMessagesWindow(conversationId: string, options: MessagesWindowOptions) {
    const conditions = [eq(chatMessages.conversationId, conversationId)];

    if (!options.includeNotes) {
        conditions.push(ne(chatMessages.senderType, "NOTE"));
    }

    if (options.beforeMessageId) {
        const anchor = await db.query.chatMessages.findFirst({
            where: and(
                eq(chatMessages.id, options.beforeMessageId),
                eq(chatMessages.conversationId, conversationId)
            ),
            columns: { id: true, createdAt: true },
        });

        if (anchor) {
            conditions.push(
                sql`(${chatMessages.createdAt} < ${anchor.createdAt} OR (${chatMessages.createdAt} = ${anchor.createdAt} AND ${chatMessages.id} < ${anchor.id}))`
            );
        }
    }

    if (!options.limit) {
        const messages = await db.query.chatMessages.findMany({
            where: and(...conditions),
            orderBy: (t, { asc }) => [asc(t.createdAt), asc(t.id)],
            columns: {
                id: true,
                body: true,
                senderType: true,
                createdAt: true,
                senderUserId: true,
            },
        });

        return { messages, hasMore: false };
    }

    const rows = await db.query.chatMessages.findMany({
        where: and(...conditions),
        orderBy: (t, { desc: orderDesc }) => [orderDesc(t.createdAt), orderDesc(t.id)],
        limit: options.limit + 1,
        columns: {
            id: true,
            body: true,
            senderType: true,
            createdAt: true,
            senderUserId: true,
        },
    });

    const hasMore = rows.length > options.limit;

    return { messages: rows.slice(0, options.limit).reverse(), hasMore };
}

async function hydrateConversation(
    conversation: ChatConversationRecord,
    options: MessagesWindowOptions
): Promise<ChatConversationDto> {
    const [user, assignee, messagesWindow] = await Promise.all([
        getChatUser(conversation.userId),
        getChatAssignee(conversation.assigneeId),
        getConversationMessagesWindow(conversation.id, options),
    ]);
    const timestamps = serializeConversationTimestamps(conversation);

    return {
        id: conversation.id,
        status: conversation.status as ChatConversationStatus,
        subject: conversation.subject,
        isPinned: conversation.isPinned,
        tags: conversation.tags ?? [],
        assigneeId: conversation.assigneeId,
        assignee,
        createdAt: timestamps.createdAt,
        updatedAt: timestamps.updatedAt,
        lastMessageAt: timestamps.lastMessageAt,
        customerLastReadAt: timestamps.customerLastReadAt,
        adminLastReadAt: timestamps.adminLastReadAt,
        closedAt: timestamps.closedAt,
        user,
        messages: messagesWindow.messages.map(serializeMessage),
        hasMoreMessages: messagesWindow.hasMore,
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
        isPinned: false,
        tags: [],
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

    return hydrateConversation(hydratedConversation, { includeNotes: false });
}

export interface ListAdminConversationsOptions {
    q?: string | null;
    cursor?: string | null;
    limit?: number | null;
}

export interface ListAdminConversationsResult {
    conversations: ChatConversationSummaryDto[];
    nextCursor: string | null;
}

interface ConversationListCursor {
    pinned: boolean;
    lastMessageAt: string;
    id: string;
}

function encodeConversationCursor(cursor: ConversationListCursor): string {
    return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeConversationCursor(cursor: string | null | undefined): ConversationListCursor | null {
    if (!cursor) {
        return null;
    }

    try {
        const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<ConversationListCursor>;

        if (typeof parsed.pinned !== "boolean" || typeof parsed.lastMessageAt !== "string" || typeof parsed.id !== "string") {
            return null;
        }

        return { pinned: parsed.pinned, lastMessageAt: parsed.lastMessageAt, id: parsed.id };
    } catch {
        return null;
    }
}

function escapeLikePattern(value: string) {
    return value.replaceAll(/[\\%_]/g, (char) => `\\${char}`);
}

export async function listAdminConversations(
    options: ListAdminConversationsOptions = {}
): Promise<ListAdminConversationsResult> {
    const limit = Math.min(Math.max(options.limit ?? CONVERSATION_LIST_PAGE_SIZE, 1), 100);
    const cursor = decodeConversationCursor(options.cursor);
    const q = options.q?.trim() ?? "";

    const assignees = alias(users, "assigneeUser");

    const conditions = [
        // Hide conversations that have no customer-visible message yet.
        sql`EXISTS (SELECT 1 FROM \`ChatMessage\` cm WHERE cm.\`conversationId\` = ${chatConversations.id} AND cm.\`senderType\` <> 'NOTE')`,
    ];

    if (q) {
        const pattern = `%${escapeLikePattern(q)}%`;

        conditions.push(
            sql`(${users.username} LIKE ${pattern} OR ${users.name} LIKE ${pattern} OR EXISTS (SELECT 1 FROM \`ChatMessage\` cm WHERE cm.\`conversationId\` = ${chatConversations.id} AND cm.\`senderType\` <> 'NOTE' AND cm.\`body\` LIKE ${pattern}))`
        );
    }

    if (cursor) {
        const pinnedValue = cursor.pinned ? 1 : 0;

        conditions.push(
            sql`(${chatConversations.isPinned} < ${pinnedValue} OR (${chatConversations.isPinned} = ${pinnedValue} AND (${chatConversations.lastMessageAt} < ${cursor.lastMessageAt} OR (${chatConversations.lastMessageAt} = ${cursor.lastMessageAt} AND ${chatConversations.id} < ${cursor.id}))))`
        );
    }

    const rows = await db
        .select({
            ...getTableColumns(chatConversations),
            userUsername: users.username,
            userName: users.name,
            userImage: users.image,
            assigneeUsername: assignees.username,
            assigneeName: assignees.name,
            lastMessageId: sql<string | null>`(SELECT cm.\`id\` FROM \`ChatMessage\` cm WHERE cm.\`conversationId\` = ${chatConversations.id} AND cm.\`senderType\` <> 'NOTE' ORDER BY cm.\`createdAt\` DESC, cm.\`id\` DESC LIMIT 1)`,
            lastMessageBody: sql<string | null>`(SELECT cm.\`body\` FROM \`ChatMessage\` cm WHERE cm.\`conversationId\` = ${chatConversations.id} AND cm.\`senderType\` <> 'NOTE' ORDER BY cm.\`createdAt\` DESC, cm.\`id\` DESC LIMIT 1)`,
            lastMessageSenderType: sql<string | null>`(SELECT cm.\`senderType\` FROM \`ChatMessage\` cm WHERE cm.\`conversationId\` = ${chatConversations.id} AND cm.\`senderType\` <> 'NOTE' ORDER BY cm.\`createdAt\` DESC, cm.\`id\` DESC LIMIT 1)`,
            unreadByAdmin: sql<number>`(SELECT COUNT(*) FROM \`ChatMessage\` cm WHERE cm.\`conversationId\` = ${chatConversations.id} AND cm.\`senderType\` = 'CUSTOMER' AND (${chatConversations.adminLastReadAt} IS NULL OR cm.\`createdAt\` > ${chatConversations.adminLastReadAt}))`,
            unreadByCustomer: sql<number>`(SELECT COUNT(*) FROM \`ChatMessage\` cm WHERE cm.\`conversationId\` = ${chatConversations.id} AND cm.\`senderType\` = 'ADMIN' AND (${chatConversations.customerLastReadAt} IS NULL OR cm.\`createdAt\` > ${chatConversations.customerLastReadAt}))`,
        })
        .from(chatConversations)
        .innerJoin(users, eq(chatConversations.userId, users.id))
        .leftJoin(assignees, eq(chatConversations.assigneeId, assignees.id))
        .where(and(...conditions))
        .orderBy(desc(chatConversations.isPinned), desc(chatConversations.lastMessageAt), desc(chatConversations.id))
        .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    const lastRow = pageRows.at(-1);

    const conversations = pageRows.map((row): ChatConversationSummaryDto => {
        const timestamps = serializeConversationTimestamps(row);

        return {
            id: row.id,
            status: row.status as ChatConversationStatus,
            subject: row.subject,
            isPinned: row.isPinned,
            tags: row.tags ?? [],
            assigneeId: row.assigneeId,
            assignee: row.assigneeId
                ? {
                    id: row.assigneeId,
                    username: row.assigneeUsername ?? "",
                    name: row.assigneeName,
                }
                : null,
            createdAt: timestamps.createdAt,
            updatedAt: timestamps.updatedAt,
            lastMessageAt: timestamps.lastMessageAt,
            customerLastReadAt: timestamps.customerLastReadAt,
            adminLastReadAt: timestamps.adminLastReadAt,
            closedAt: timestamps.closedAt,
            unreadByAdmin: Number(row.unreadByAdmin ?? 0),
            unreadByCustomer: Number(row.unreadByCustomer ?? 0),
            lastMessagePreview: row.lastMessageId && row.lastMessageBody !== null
                ? parseChatMessageContent({
                    messageId: row.lastMessageId,
                    body: row.lastMessageBody,
                }).previewText
                : "",
            lastMessageSenderType: (row.lastMessageSenderType as ChatSenderType | null) ?? null,
            user: {
                id: row.userId,
                username: row.userUsername,
                name: row.userName,
                image: row.userImage,
            },
        };
    });

    return {
        conversations,
        nextCursor: hasMore && lastRow
            ? encodeConversationCursor({
                pinned: lastRow.isPinned,
                lastMessageAt: lastRow.lastMessageAt,
                id: lastRow.id,
            })
            : null,
    };
}

export interface GetAdminConversationOptions {
    beforeMessageId?: string | null;
    limit?: number | null;
}

export async function getAdminConversation(
    conversationId: string,
    options: GetAdminConversationOptions = {}
): Promise<ChatConversationDto | null> {
    const conversation = await db.query.chatConversations.findFirst({
        where: eq(chatConversations.id, conversationId),
    });

    if (!conversation) {
        return null;
    }

    return hydrateConversation(conversation, {
        includeNotes: true,
        beforeMessageId: options.beforeMessageId ?? null,
        limit: options.limit ?? ADMIN_MESSAGES_PAGE_SIZE,
    });
}

export interface AdminUnreadSummary {
    totalUnread: number;
    unreadConversations: number;
}

export async function countAdminUnread(): Promise<AdminUnreadSummary> {
    const [result] = await db
        .select({
            totalUnread: sql<number>`COUNT(*)`,
            unreadConversations: sql<number>`COUNT(DISTINCT ${chatMessages.conversationId})`,
        })
        .from(chatMessages)
        .innerJoin(chatConversations, eq(chatMessages.conversationId, chatConversations.id))
        .where(
            and(
                eq(chatMessages.senderType, "CUSTOMER"),
                sql`(${chatConversations.adminLastReadAt} IS NULL OR ${chatMessages.createdAt} > ${chatConversations.adminLastReadAt})`
            )
        );

    return {
        totalUnread: Number(result?.totalUnread ?? 0),
        unreadConversations: Number(result?.unreadConversations ?? 0),
    };
}

export async function sendConversationMessage(params: {
    userId: string;
    senderType: ChatSenderType;
    body: string;
    conversationId?: string;
}) {
    const sanitizedBody = parseChatImagePayload(params.body)
        ? params.body
        : parseChatMessagePayload({ message: params.body });

    const now = mysqlNow();

    const conversation = params.conversationId
        ? await db.query.chatConversations.findFirst({
            where: eq(chatConversations.id, params.conversationId),
        })
        : await getOrCreateUserConversation(params.userId);

    if (!conversation) {
        throw new Error("Conversation not found");
    }

    if (params.senderType === "NOTE") {
        // Internal notes stay invisible to the customer: no lastMessageAt bump,
        // no status reopen, no read-cursor changes.
        await db.insert(chatMessages).values({
            conversationId: conversation.id,
            senderType: "NOTE",
            senderUserId: params.userId,
            body: sanitizedBody,
            createdAt: now,
        });

        return conversation.id;
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

export async function markConversationRead(conversationId: string, actor: "CUSTOMER" | "ADMIN") {
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

export async function updateConversationAdminMeta(
    conversationId: string,
    input: {
        isPinned?: boolean;
        tags?: unknown;
    }
) {
    const updateData: {
        isPinned?: boolean;
        tags?: string[];
    } = {};

    if (typeof input.isPinned === "boolean") {
        updateData.isPinned = input.isPinned;
    }

    if (input.tags !== undefined) {
        updateData.tags = sanitizeChatTags(input.tags);
    }

    if (Object.keys(updateData).length === 0) {
        return;
    }

    await db.update(chatConversations).set(updateData).where(eq(chatConversations.id, conversationId));
}

export async function updateConversationAssignee(conversationId: string, assigneeId: string | null) {
    if (assigneeId) {
        const assignee = await db.query.users.findFirst({
            where: eq(users.id, assigneeId),
            columns: { id: true, role: true },
        });

        if (!assignee || assignee.role === "USER") {
            throw new Error("ผู้รับผิดชอบต้องเป็นแอดมินหรือทีมงานเท่านั้น");
        }
    }

    await db.update(chatConversations).set({ assigneeId }).where(eq(chatConversations.id, conversationId));
}

export async function listChatAgents(): Promise<Array<ChatAssigneeSummary & { role: string }>> {
    const agents = await db.query.users.findMany({
        where: ne(users.role, "USER"),
        orderBy: (t, { asc }) => asc(t.username),
        columns: {
            id: true,
            username: true,
            name: true,
            role: true,
        },
    });

    return agents;
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

export async function getConversationCustomerContext(conversationId: string): Promise<ChatCustomerContext | null> {
    const conversation = await db.query.chatConversations.findFirst({
        where: eq(chatConversations.id, conversationId),
        columns: { id: true, userId: true },
    });

    if (!conversation) {
        return null;
    }

    const [user, recentOrders, recentTopups] = await Promise.all([
        db.query.users.findFirst({
            where: eq(users.id, conversation.userId),
            columns: {
                id: true,
                username: true,
                name: true,
                image: true,
                creditBalance: true,
                pointBalance: true,
                totalTopup: true,
                createdAt: true,
                lastLoginAt: true,
                bannedAt: true,
                banReason: true,
            },
        }),
        db.query.orders.findMany({
            where: eq(orders.userId, conversation.userId),
            orderBy: (t, { desc: orderDesc }) => orderDesc(t.purchasedAt),
            limit: 5,
            columns: {
                id: true,
                productName: true,
                totalPrice: true,
                status: true,
                purchasedAt: true,
            },
        }),
        db.query.topups.findMany({
            where: eq(topups.userId, conversation.userId),
            orderBy: (t, { desc: orderDesc }) => orderDesc(t.createdAt),
            limit: 5,
            columns: {
                id: true,
                amount: true,
                status: true,
                paymentMethod: true,
                createdAt: true,
            },
        }),
    ]);

    if (!user) {
        return null;
    }

    return {
        user: {
            id: user.id,
            username: user.username,
            name: user.name,
            image: user.image,
            creditBalance: user.creditBalance,
            pointBalance: user.pointBalance,
            totalTopup: user.totalTopup,
            createdAt: mysqlDateTimeToIso(user.createdAt) ?? user.createdAt,
            lastLoginAt: mysqlDateTimeToIso(user.lastLoginAt),
            bannedAt: mysqlDateTimeToIso(user.bannedAt),
            banReason: user.banReason,
        },
        recentOrders: recentOrders.map((order) => ({
            id: order.id,
            productName: order.productName,
            totalPrice: order.totalPrice,
            status: order.status,
            purchasedAt: mysqlDateTimeToIso(order.purchasedAt) ?? order.purchasedAt,
        })),
        recentTopups: recentTopups.map((topup) => ({
            id: topup.id,
            amount: topup.amount,
            status: topup.status,
            paymentMethod: topup.paymentMethod,
            createdAt: mysqlDateTimeToIso(topup.createdAt) ?? topup.createdAt,
        })),
    };
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
