SET @season_pass_reward_image_url_exists := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'SeasonPassReward'
      AND column_name = 'imageUrl'
);
--> statement-breakpoint
SET @season_pass_reward_image_url_sql := IF(
    @season_pass_reward_image_url_exists = 0,
    'ALTER TABLE `SeasonPassReward` ADD COLUMN `imageUrl` varchar(500) NULL AFTER `amount`',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE season_pass_reward_image_url_stmt FROM @season_pass_reward_image_url_sql;
--> statement-breakpoint
EXECUTE season_pass_reward_image_url_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE season_pass_reward_image_url_stmt;
