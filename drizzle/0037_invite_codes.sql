-- InviteCode / InviteClickDaily: marketing attribution for hired promoters.
-- Each promotion channel gets a row and a link (/r/<code>); the click counter is
-- one row per code per day (same shape as `ProductViewDaily`) and `User`.
-- `inviteCodeId` is stamped once at registration so every later top-up by that
-- account counts towards the channel that brought them in.
-- The FK on `User`.`inviteCodeId` is ON DELETE RESTRICT on purpose: a code is
-- switched off with `isActive`, never deleted, because that column is the only
-- record of where a signup came from.
-- Every varchar that takes part in a foreign key is pinned to
-- utf8mb4_unicode_ci; the MySQL 8 server default (utf8mb4_0900_ai_ci) makes the
-- constraint fail with ERROR 3780.
-- Idempotent so it is safe to re-run.
CREATE TABLE IF NOT EXISTS `InviteCode` (
    `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `code` varchar(32) NOT NULL,
    `label` varchar(120) NOT NULL,
    `note` varchar(500) NULL,
    `destination` varchar(255) NOT NULL DEFAULT '/shop',
    `isActive` tinyint(1) NOT NULL DEFAULT 1,
    `createdAt` datetime NOT NULL DEFAULT now(),
    `updatedAt` datetime NOT NULL DEFAULT now(),
    CONSTRAINT `InviteCode_id` PRIMARY KEY (`id`),
    CONSTRAINT `InviteCode_code_unique` UNIQUE KEY (`code`),
    KEY `idx_invite_code_isActive` (`isActive`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `InviteClickDaily` (
    `id` int AUTO_INCREMENT NOT NULL,
    `inviteCodeId` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `clickDate` date NOT NULL,
    `clicks` int NOT NULL DEFAULT 0,
    CONSTRAINT `InviteClickDaily_id` PRIMARY KEY (`id`),
    CONSTRAINT `uq_invite_click_daily` UNIQUE KEY (`inviteCodeId`, `clickDate`),
    KEY `idx_invite_click_daily_date` (`clickDate`),
    CONSTRAINT `InviteClickDaily_inviteCodeId_InviteCode_id_fk` FOREIGN KEY (`inviteCodeId`) REFERENCES `InviteCode` (`id`) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint

SET @user_invite_code_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'User' AND column_name = 'inviteCodeId');
--> statement-breakpoint
SET @user_invite_code_sql := IF(@user_invite_code_exists = 0, 'ALTER TABLE `User` ADD COLUMN `inviteCodeId` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `lastLoginAt`', 'SELECT 1');
--> statement-breakpoint
PREPARE user_invite_code_stmt FROM @user_invite_code_sql;
--> statement-breakpoint
EXECUTE user_invite_code_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE user_invite_code_stmt;
--> statement-breakpoint

SET @user_invite_index_exists := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'User' AND index_name = 'idx_user_inviteCodeId');
--> statement-breakpoint
SET @user_invite_index_sql := IF(@user_invite_index_exists = 0, 'CREATE INDEX `idx_user_inviteCodeId` ON `User` (`inviteCodeId`, `createdAt`)', 'SELECT 1');
--> statement-breakpoint
PREPARE user_invite_index_stmt FROM @user_invite_index_sql;
--> statement-breakpoint
EXECUTE user_invite_index_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE user_invite_index_stmt;
--> statement-breakpoint

SET @user_invite_fk_exists := (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'User' AND constraint_name = 'User_inviteCodeId_InviteCode_id_fk');
--> statement-breakpoint
SET @user_invite_fk_sql := IF(@user_invite_fk_exists = 0, 'ALTER TABLE `User` ADD CONSTRAINT `User_inviteCodeId_InviteCode_id_fk` FOREIGN KEY (`inviteCodeId`) REFERENCES `InviteCode` (`id`) ON DELETE RESTRICT', 'SELECT 1');
--> statement-breakpoint
PREPARE user_invite_fk_stmt FROM @user_invite_fk_sql;
--> statement-breakpoint
EXECUTE user_invite_fk_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE user_invite_fk_stmt;
