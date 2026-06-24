-- Topup: paymentMethod — channel the top-up came through ("bank" | "truewallet"),
-- captured from slip verification. Powers the dashboard top-up channel distribution.
-- Idempotent so it is safe to re-run; existing rows stay NULL (legacy, uncharted).
SET @topup_payment_method_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Topup' AND column_name = 'paymentMethod');
--> statement-breakpoint
SET @topup_payment_method_sql := IF(@topup_payment_method_exists = 0, 'ALTER TABLE `Topup` ADD COLUMN `paymentMethod` varchar(20) NULL AFTER `receiverBank`', 'SELECT 1');
--> statement-breakpoint
PREPARE topup_payment_method_stmt FROM @topup_payment_method_sql;
--> statement-breakpoint
EXECUTE topup_payment_method_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE topup_payment_method_stmt;
--> statement-breakpoint

SET @topup_payment_method_idx_exists := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Topup' AND index_name = 'idx_topup_status_paymentMethod');
--> statement-breakpoint
SET @topup_payment_method_idx_sql := IF(@topup_payment_method_idx_exists = 0, 'CREATE INDEX `idx_topup_status_paymentMethod` ON `Topup` (`status`, `paymentMethod`)', 'SELECT 1');
--> statement-breakpoint
PREPARE topup_payment_method_idx_stmt FROM @topup_payment_method_idx_sql;
--> statement-breakpoint
EXECUTE topup_payment_method_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE topup_payment_method_idx_stmt;
