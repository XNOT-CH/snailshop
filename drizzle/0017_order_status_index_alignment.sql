SET @order_user_status_purchased_at_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'Order'
      AND index_name = 'idx_order_user_status_purchasedAt'
);
--> statement-breakpoint
SET @order_user_status_purchased_at_drop_sql := IF(
    @order_user_status_purchased_at_index_exists > 0,
    'DROP INDEX `idx_order_user_status_purchasedAt` ON `Order`',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE order_user_status_purchased_at_drop_stmt FROM @order_user_status_purchased_at_drop_sql;
--> statement-breakpoint
EXECUTE order_user_status_purchased_at_drop_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE order_user_status_purchased_at_drop_stmt;

--> statement-breakpoint
SET @order_user_status_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'Order'
      AND index_name = 'idx_order_user_status'
);
--> statement-breakpoint
SET @order_user_status_index_sql := IF(
    @order_user_status_index_exists = 0,
    'CREATE INDEX `idx_order_user_status` ON `Order` (`userId`, `status`)',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE order_user_status_index_stmt FROM @order_user_status_index_sql;
--> statement-breakpoint
EXECUTE order_user_status_index_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE order_user_status_index_stmt;
