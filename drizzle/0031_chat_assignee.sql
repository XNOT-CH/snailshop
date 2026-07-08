-- ChatConversation: assigneeId (NULL = unassigned) + lookup index
SET @chat_assignee_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'ChatConversation' AND column_name = 'assigneeId');
--> statement-breakpoint
SET @chat_assignee_sql := IF(@chat_assignee_exists = 0, 'ALTER TABLE `ChatConversation` ADD COLUMN `assigneeId` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE chat_assignee_stmt FROM @chat_assignee_sql;
--> statement-breakpoint
EXECUTE chat_assignee_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE chat_assignee_stmt;
--> statement-breakpoint

SET @chat_assignee_fk_exists := (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'ChatConversation' AND constraint_name = 'ChatConversation_assigneeId_User_id_fk');
--> statement-breakpoint
SET @chat_assignee_fk_sql := IF(@chat_assignee_fk_exists = 0, 'ALTER TABLE `ChatConversation` ADD CONSTRAINT `ChatConversation_assigneeId_User_id_fk` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE SET NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE chat_assignee_fk_stmt FROM @chat_assignee_fk_sql;
--> statement-breakpoint
EXECUTE chat_assignee_fk_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE chat_assignee_fk_stmt;
--> statement-breakpoint

SET @chat_assignee_idx_exists := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'ChatConversation' AND index_name = 'idx_chat_conversation_assignee');
--> statement-breakpoint
SET @chat_assignee_idx_sql := IF(@chat_assignee_idx_exists = 0, 'CREATE INDEX `idx_chat_conversation_assignee` ON `ChatConversation` (`assigneeId`, `lastMessageAt`)', 'SELECT 1');
--> statement-breakpoint
PREPARE chat_assignee_idx_stmt FROM @chat_assignee_idx_sql;
--> statement-breakpoint
EXECUTE chat_assignee_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE chat_assignee_idx_stmt;
