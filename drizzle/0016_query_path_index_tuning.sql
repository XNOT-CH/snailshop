SET @season_pass_subscription_user_status_end_at_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'SeasonPassSubscription'
      AND index_name = 'idx_season_pass_subscription_user_status_endAt'
);
--> statement-breakpoint
SET @season_pass_subscription_user_status_end_at_index_sql := IF(
    @season_pass_subscription_user_status_end_at_index_exists = 0,
    'CREATE INDEX `idx_season_pass_subscription_user_status_endAt` ON `SeasonPassSubscription` (`userId`, `status`, `endAt`)',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE season_pass_subscription_user_status_end_at_index_stmt FROM @season_pass_subscription_user_status_end_at_index_sql;
--> statement-breakpoint
EXECUTE season_pass_subscription_user_status_end_at_index_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE season_pass_subscription_user_status_end_at_index_stmt;

--> statement-breakpoint
SET @order_user_status_purchased_at_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'Order'
      AND index_name = 'idx_order_user_status_purchasedAt'
);
--> statement-breakpoint
SET @order_user_status_purchased_at_index_sql := IF(
    @order_user_status_purchased_at_index_exists = 0,
    'CREATE INDEX `idx_order_user_status_purchasedAt` ON `Order` (`userId`, `status`, `purchasedAt`)',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE order_user_status_purchased_at_index_stmt FROM @order_user_status_purchased_at_index_sql;
--> statement-breakpoint
EXECUTE order_user_status_purchased_at_index_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE order_user_status_purchased_at_index_stmt;
