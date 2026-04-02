CREATE TABLE IF NOT EXISTS `ChatConversation` (
    `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
    `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
    `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
    `subject` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `customerLastReadAt` datetime(3) DEFAULT NULL,
    `adminLastReadAt` datetime(3) DEFAULT NULL,
    `lastMessageAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` datetime(3) DEFAULT NULL,
    `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ChatMessage` (
    `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
    `conversationId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
    `senderType` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
    `senderUserId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
    `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;--> statement-breakpoint
ALTER TABLE `ChatConversation`
    MODIFY COLUMN `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
    MODIFY COLUMN `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
    MODIFY COLUMN `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
    MODIFY COLUMN `subject` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    MODIFY COLUMN `customerLastReadAt` datetime(3) DEFAULT NULL,
    MODIFY COLUMN `adminLastReadAt` datetime(3) DEFAULT NULL,
    MODIFY COLUMN `lastMessageAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY COLUMN `closedAt` datetime(3) DEFAULT NULL,
    MODIFY COLUMN `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY COLUMN `updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);--> statement-breakpoint
ALTER TABLE `ChatMessage`
    MODIFY COLUMN `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
    MODIFY COLUMN `conversationId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
    MODIFY COLUMN `senderType` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
    MODIFY COLUMN `senderUserId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    MODIFY COLUMN `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
    MODIFY COLUMN `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);--> statement-breakpoint
ALTER TABLE `ChatConversation` ADD CONSTRAINT `ChatConversation_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_conversationId_ChatConversation_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `ChatConversation`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_senderUserId_User_id_fk` FOREIGN KEY (`senderUserId`) REFERENCES `User`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_chat_conversation_user_last_message` ON `ChatConversation` (`userId`,`lastMessageAt`);--> statement-breakpoint
CREATE INDEX `idx_chat_conversation_status_last_message` ON `ChatConversation` (`status`,`lastMessageAt`);--> statement-breakpoint
CREATE INDEX `idx_chat_message_conversation_created` ON `ChatMessage` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_chat_message_sender_created` ON `ChatMessage` (`senderType`,`createdAt`);
