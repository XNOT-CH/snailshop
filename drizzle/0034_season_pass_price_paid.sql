-- SeasonPassSubscription: pricePaid snapshot (NULL = bought before this column
-- existed). Revenue for Season Pass used to be reconstructed as "rows this
-- month x the plan's current price", so raising the price rewrote past months.
-- Idempotent so it is safe to re-run.
SET @sp_price_paid_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SeasonPassSubscription' AND column_name = 'pricePaid');
--> statement-breakpoint
SET @sp_price_paid_sql := IF(@sp_price_paid_exists = 0, 'ALTER TABLE `SeasonPassSubscription` ADD COLUMN `pricePaid` decimal(10,2) NULL AFTER `planId`', 'SELECT 1');
--> statement-breakpoint
PREPARE sp_price_paid_stmt FROM @sp_price_paid_sql;
--> statement-breakpoint
EXECUTE sp_price_paid_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sp_price_paid_stmt;
--> statement-breakpoint

-- The admin overview and the dashboard revenue queries both sum by createdAt.
SET @sp_created_idx_exists := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'SeasonPassSubscription' AND index_name = 'idx_season_pass_subscription_createdAt');
--> statement-breakpoint
SET @sp_created_idx_sql := IF(@sp_created_idx_exists = 0, 'CREATE INDEX `idx_season_pass_subscription_createdAt` ON `SeasonPassSubscription` (`createdAt`)', 'SELECT 1');
--> statement-breakpoint
PREPARE sp_created_idx_stmt FROM @sp_created_idx_sql;
--> statement-breakpoint
EXECUTE sp_created_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sp_created_idx_stmt;
