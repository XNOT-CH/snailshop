-- Product: deletedAt soft-delete marker (NULL = active/visible). Deleting a
-- product from admin now sets this instead of removing the row, so an
-- accidental delete can be restored from the trash instead of requiring a DB
-- backup restore.
-- Idempotent so it is safe to re-run.
SET @product_deleted_at_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Product' AND column_name = 'deletedAt');
--> statement-breakpoint
SET @product_deleted_at_sql := IF(@product_deleted_at_exists = 0, 'ALTER TABLE `Product` ADD COLUMN `deletedAt` datetime NULL AFTER `scheduledDeleteAt`', 'SELECT 1');
--> statement-breakpoint
PREPARE product_deleted_at_stmt FROM @product_deleted_at_sql;
--> statement-breakpoint
EXECUTE product_deleted_at_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE product_deleted_at_stmt;
--> statement-breakpoint

SET @product_deleted_at_idx_exists := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Product' AND index_name = 'idx_product_deletedAt');
--> statement-breakpoint
SET @product_deleted_at_idx_sql := IF(@product_deleted_at_idx_exists = 0, 'CREATE INDEX `idx_product_deletedAt` ON `Product` (`deletedAt`)', 'SELECT 1');
--> statement-breakpoint
PREPARE product_deleted_at_idx_stmt FROM @product_deleted_at_idx_sql;
--> statement-breakpoint
EXECUTE product_deleted_at_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE product_deleted_at_idx_stmt;
