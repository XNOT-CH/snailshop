-- PromoCode: requiresApproval — when true, redeeming a CREDIT code creates a
-- PENDING PromoUsage instead of crediting the balance immediately; an admin
-- must approve/reject it from the topup code usage page. Existing codes keep
-- their current instant-credit behaviour (default false).
-- Idempotent so it is safe to re-run.
SET @promocode_requires_approval_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'PromoCode' AND column_name = 'requiresApproval');
--> statement-breakpoint
SET @promocode_requires_approval_sql := IF(@promocode_requires_approval_exists = 0, 'ALTER TABLE `PromoCode` ADD COLUMN `requiresApproval` boolean NOT NULL DEFAULT false AFTER `usedCount`', 'SELECT 1');
--> statement-breakpoint
PREPARE promocode_requires_approval_stmt FROM @promocode_requires_approval_sql;
--> statement-breakpoint
EXECUTE promocode_requires_approval_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE promocode_requires_approval_stmt;
