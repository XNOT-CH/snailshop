import { asc, eq } from "drizzle-orm";
import { db, chatQuickReplies } from "@/lib/db";
import { mysqlNow } from "@/lib/utils/date";
import { normalizeQuickReplyPayload } from "@/lib/chatAdmin";

export interface ChatQuickReplyDto {
    id: string;
    title: string;
    body: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

type ChatQuickReplyRecord = typeof chatQuickReplies.$inferSelect;

function serializeQuickReply(reply: ChatQuickReplyRecord): ChatQuickReplyDto {
    return {
        id: reply.id,
        title: reply.title,
        body: reply.body,
        sortOrder: reply.sortOrder,
        isActive: reply.isActive,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
    };
}

export async function listChatQuickReplies(includeInactive = true): Promise<ChatQuickReplyDto[]> {
    const replies = await db.query.chatQuickReplies.findMany({
        where: includeInactive ? undefined : eq(chatQuickReplies.isActive, true),
        orderBy: (table) => [asc(table.sortOrder), asc(table.createdAt)],
    });

    return replies.map(serializeQuickReply);
}

export async function createChatQuickReply(input: unknown): Promise<ChatQuickReplyDto> {
    const payload = normalizeQuickReplyPayload(input);

    if (!payload.title || !payload.body) {
        throw new Error("Quick reply title and body are required");
    }

    const now = mysqlNow();
    const id = crypto.randomUUID();

    await db.insert(chatQuickReplies).values({
        id,
        title: payload.title,
        body: payload.body,
        sortOrder: payload.sortOrder,
        isActive: payload.isActive,
        createdAt: now,
        updatedAt: now,
    });

    const reply = await db.query.chatQuickReplies.findFirst({
        where: eq(chatQuickReplies.id, id),
    });

    if (!reply) {
        throw new Error("Failed to create quick reply");
    }

    return serializeQuickReply(reply);
}

export async function updateChatQuickReply(id: string, input: unknown): Promise<ChatQuickReplyDto | null> {
    const existing = await db.query.chatQuickReplies.findFirst({
        where: eq(chatQuickReplies.id, id),
    });

    if (!existing) {
        return null;
    }

    const payload = normalizeQuickReplyPayload(input);

    if (!payload.title || !payload.body) {
        throw new Error("Quick reply title and body are required");
    }

    await db.update(chatQuickReplies).set({
        title: payload.title,
        body: payload.body,
        sortOrder: payload.sortOrder,
        isActive: payload.isActive,
        updatedAt: mysqlNow(),
    }).where(eq(chatQuickReplies.id, id));

    const updated = await db.query.chatQuickReplies.findFirst({
        where: eq(chatQuickReplies.id, id),
    });

    return updated ? serializeQuickReply(updated) : null;
}

export async function deleteChatQuickReply(id: string) {
    await db.delete(chatQuickReplies).where(eq(chatQuickReplies.id, id));
}
