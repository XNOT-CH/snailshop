ALTER TABLE `ChatConversation`
    ADD COLUMN `isPinned` boolean NOT NULL DEFAULT false,
    ADD COLUMN `tags` json NULL;--> statement-breakpoint
UPDATE `ChatConversation`
SET `tags` = JSON_ARRAY()
WHERE `tags` IS NULL;--> statement-breakpoint
ALTER TABLE `ChatConversation`
    MODIFY COLUMN `tags` json NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_chat_conversation_pinned_last_message` ON `ChatConversation` (`isPinned`,`lastMessageAt`);--> statement-breakpoint
CREATE TABLE `ChatQuickReply` (
    `id` varchar(36) NOT NULL,
    `title` varchar(120) NOT NULL,
    `body` text NOT NULL,
    `sortOrder` int NOT NULL DEFAULT 0,
    `isActive` boolean NOT NULL DEFAULT true,
    `createdAt` datetime NOT NULL DEFAULT (now()),
    `updatedAt` datetime NOT NULL DEFAULT (now()),
    PRIMARY KEY (`id`)
);--> statement-breakpoint
CREATE INDEX `idx_chat_quick_reply_active_sort` ON `ChatQuickReply` (`isActive`,`sortOrder`);
