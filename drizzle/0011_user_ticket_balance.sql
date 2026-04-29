SET @user_ticket_balance_exists := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'User'
      AND column_name = 'ticketBalance'
);
--> statement-breakpoint
SET @user_ticket_balance_sql := IF(
    @user_ticket_balance_exists = 0,
    'ALTER TABLE `User` ADD COLUMN `ticketBalance` int NOT NULL DEFAULT 0 AFTER `pointBalance`',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE user_ticket_balance_stmt FROM @user_ticket_balance_sql;
--> statement-breakpoint
EXECUTE user_ticket_balance_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE user_ticket_balance_stmt;
