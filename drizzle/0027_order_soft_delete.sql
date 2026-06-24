-- Order: deletedAt soft-delete marker (NULL = visible in the user's inventory).
-- A user hiding an order sets this instead of deleting the row, so the sale stays
-- in admin revenue/exports and still counts toward new-user promo eligibility.
SET @order_deleted_at_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Order' AND column_name = 'deletedAt');
--> statement-breakpoint
SET @order_deleted_at_sql := IF(@order_deleted_at_exists = 0, 'ALTER TABLE `Order` ADD COLUMN `deletedAt` datetime NULL AFTER `purchasedAt`', 'SELECT 1');
--> statement-breakpoint
PREPARE order_deleted_at_stmt FROM @order_deleted_at_sql;
--> statement-breakpoint
EXECUTE order_deleted_at_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE order_deleted_at_stmt;
--> statement-breakpoint

SET @order_deleted_at_idx_exists := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Order' AND index_name = 'idx_order_userId_deletedAt');
--> statement-breakpoint
SET @order_deleted_at_idx_sql := IF(@order_deleted_at_idx_exists = 0, 'CREATE INDEX `idx_order_userId_deletedAt` ON `Order` (`userId`, `deletedAt`)', 'SELECT 1');
--> statement-breakpoint
PREPARE order_deleted_at_idx_stmt FROM @order_deleted_at_idx_sql;
--> statement-breakpoint
EXECUTE order_deleted_at_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE order_deleted_at_idx_stmt;
