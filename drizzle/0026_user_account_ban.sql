-- User: bannedAt / banReason (NULL bannedAt = active account)
SET @user_banned_at_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'User' AND column_name = 'bannedAt');
--> statement-breakpoint
SET @user_banned_at_sql := IF(@user_banned_at_exists = 0, 'ALTER TABLE `User` ADD COLUMN `bannedAt` datetime NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE user_banned_at_stmt FROM @user_banned_at_sql;
--> statement-breakpoint
EXECUTE user_banned_at_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE user_banned_at_stmt;
--> statement-breakpoint

SET @user_ban_reason_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'User' AND column_name = 'banReason');
--> statement-breakpoint
SET @user_ban_reason_sql := IF(@user_ban_reason_exists = 0, 'ALTER TABLE `User` ADD COLUMN `banReason` varchar(255) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE user_ban_reason_stmt FROM @user_ban_reason_sql;
--> statement-breakpoint
EXECUTE user_ban_reason_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE user_ban_reason_stmt;
