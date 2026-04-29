SET @season_pass_plan_active_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'SeasonPassPlan'
      AND index_name = 'idx_season_pass_plan_active'
);
--> statement-breakpoint
SET @season_pass_plan_active_index_sql := IF(
    @season_pass_plan_active_index_exists = 0,
    'CREATE INDEX `idx_season_pass_plan_active` ON `SeasonPassPlan` (`isActive`)',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE season_pass_plan_active_index_stmt FROM @season_pass_plan_active_index_sql;
--> statement-breakpoint
EXECUTE season_pass_plan_active_index_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE season_pass_plan_active_index_stmt;

--> statement-breakpoint
SET @season_pass_subscription_user_status_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'SeasonPassSubscription'
      AND index_name = 'idx_season_pass_subscription_user_status'
);
--> statement-breakpoint
SET @season_pass_subscription_user_status_index_sql := IF(
    @season_pass_subscription_user_status_index_exists = 0,
    'CREATE INDEX `idx_season_pass_subscription_user_status` ON `SeasonPassSubscription` (`userId`, `status`)',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE season_pass_subscription_user_status_index_stmt FROM @season_pass_subscription_user_status_index_sql;
--> statement-breakpoint
EXECUTE season_pass_subscription_user_status_index_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE season_pass_subscription_user_status_index_stmt;

--> statement-breakpoint
SET @season_pass_subscription_end_at_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'SeasonPassSubscription'
      AND index_name = 'idx_season_pass_subscription_endAt'
);
--> statement-breakpoint
SET @season_pass_subscription_end_at_index_sql := IF(
    @season_pass_subscription_end_at_index_exists = 0,
    'CREATE INDEX `idx_season_pass_subscription_endAt` ON `SeasonPassSubscription` (`endAt`)',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE season_pass_subscription_end_at_index_stmt FROM @season_pass_subscription_end_at_index_sql;
--> statement-breakpoint
EXECUTE season_pass_subscription_end_at_index_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE season_pass_subscription_end_at_index_stmt;

--> statement-breakpoint
SET @season_pass_claim_user_created_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'SeasonPassClaim'
      AND index_name = 'idx_season_pass_claim_user_created'
);
--> statement-breakpoint
SET @season_pass_claim_user_created_index_sql := IF(
    @season_pass_claim_user_created_index_exists = 0,
    'CREATE INDEX `idx_season_pass_claim_user_created` ON `SeasonPassClaim` (`userId`, `createdAt`)',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE season_pass_claim_user_created_index_stmt FROM @season_pass_claim_user_created_index_sql;
--> statement-breakpoint
EXECUTE season_pass_claim_user_created_index_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE season_pass_claim_user_created_index_stmt;

--> statement-breakpoint
SET @season_pass_reward_plan_day_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'SeasonPassReward'
      AND index_name = 'idx_season_pass_reward_plan_day'
);
--> statement-breakpoint
SET @season_pass_reward_plan_day_index_sql := IF(
    @season_pass_reward_plan_day_index_exists = 0,
    'CREATE INDEX `idx_season_pass_reward_plan_day` ON `SeasonPassReward` (`planId`, `dayNumber`)',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE season_pass_reward_plan_day_index_stmt FROM @season_pass_reward_plan_day_index_sql;
--> statement-breakpoint
EXECUTE season_pass_reward_plan_day_index_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE season_pass_reward_plan_day_index_stmt;
