-- InviteCode.deletedAt: "ลบ" in the admin table hides the link for good and
-- stops it working, but keeps the row. User.inviteCodeId points here and is the
-- only record of which channel a signup came from, so a real DELETE would take
-- the numbers the shop paid for with it (and the ON DELETE RESTRICT foreign key
-- would refuse anyway).
-- Replaces idx_invite_code_isActive with the two-column version the list query
-- filters on.
-- Idempotent so it is safe to re-run.
SET @invite_deleted_at_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'InviteCode' AND column_name = 'deletedAt');
--> statement-breakpoint
SET @invite_deleted_at_sql := IF(@invite_deleted_at_exists = 0, 'ALTER TABLE `InviteCode` ADD COLUMN `deletedAt` datetime NULL AFTER `isActive`', 'SELECT 1');
--> statement-breakpoint
PREPARE invite_deleted_at_stmt FROM @invite_deleted_at_sql;
--> statement-breakpoint
EXECUTE invite_deleted_at_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE invite_deleted_at_stmt;
--> statement-breakpoint

SET @invite_old_index_exists := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'InviteCode' AND index_name = 'idx_invite_code_isActive');
--> statement-breakpoint
SET @invite_drop_index_sql := IF(@invite_old_index_exists > 0, 'DROP INDEX `idx_invite_code_isActive` ON `InviteCode`', 'SELECT 1');
--> statement-breakpoint
PREPARE invite_drop_index_stmt FROM @invite_drop_index_sql;
--> statement-breakpoint
EXECUTE invite_drop_index_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE invite_drop_index_stmt;
--> statement-breakpoint

CREATE INDEX `idx_invite_code_isActive` ON `InviteCode` (`isActive`, `deletedAt`);
