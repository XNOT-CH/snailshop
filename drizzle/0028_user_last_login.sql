-- User: lastLoginAt — stamped on each successful credential login.
-- Powers the dashboard "active users today" KPI. Idempotent so it is safe to
-- re-run; existing rows stay NULL until the user next logs in.
SET @user_last_login_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'User' AND column_name = 'lastLoginAt');
--> statement-breakpoint
SET @user_last_login_sql := IF(@user_last_login_exists = 0, 'ALTER TABLE `User` ADD COLUMN `lastLoginAt` datetime NULL AFTER `lifetimePoints`', 'SELECT 1');
--> statement-breakpoint
PREPARE user_last_login_stmt FROM @user_last_login_sql;
--> statement-breakpoint
EXECUTE user_last_login_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE user_last_login_stmt;
--> statement-breakpoint

SET @user_last_login_idx_exists := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'User' AND index_name = 'idx_user_lastLoginAt');
--> statement-breakpoint
SET @user_last_login_idx_sql := IF(@user_last_login_idx_exists = 0, 'CREATE INDEX `idx_user_lastLoginAt` ON `User` (`lastLoginAt`)', 'SELECT 1');
--> statement-breakpoint
PREPARE user_last_login_idx_stmt FROM @user_last_login_idx_sql;
--> statement-breakpoint
EXECUTE user_last_login_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE user_last_login_idx_stmt;
