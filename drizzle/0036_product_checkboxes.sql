-- ProductCheckbox: the consent boxes an admin writes for one product ("ใช้แล้ว
-- ไม่คืนเงิน" and the like). A row with isRequired = 1 has to be ticked before
-- that product can be bought; /api/purchase and /api/cart/checkout enforce it,
-- so the UI is not the only guard.
-- `productId` must be utf8mb4_unicode_ci to match `Product`.`id`; the MySQL 8
-- server default (utf8mb4_0900_ai_ci) makes the foreign key fail with ERROR 3780.
-- `Order`.`acceptedChecks` stores the snapshot of what was ticked, so the record
-- survives the checkbox rows being edited or deleted later.
-- Idempotent so it is safe to re-run.
CREATE TABLE IF NOT EXISTS `ProductCheckbox` (
    `id` varchar(36) NOT NULL,
    `productId` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `title` varchar(255) NOT NULL,
    `description` text NULL,
    `isRequired` tinyint(1) NOT NULL DEFAULT 1,
    `createdAt` datetime NOT NULL DEFAULT now(),
    `updatedAt` datetime NOT NULL DEFAULT now(),
    CONSTRAINT `ProductCheckbox_id` PRIMARY KEY (`id`),
    KEY `idx_product_checkbox_productId` (`productId`),
    CONSTRAINT `ProductCheckbox_productId_Product_id_fk` FOREIGN KEY (`productId`) REFERENCES `Product` (`id`) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint

SET @order_accepted_checks_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Order' AND column_name = 'acceptedChecks');
--> statement-breakpoint
SET @order_accepted_checks_sql := IF(@order_accepted_checks_exists = 0, 'ALTER TABLE `Order` ADD COLUMN `acceptedChecks` json NULL AFTER `status`', 'SELECT 1');
--> statement-breakpoint
PREPARE order_accepted_checks_stmt FROM @order_accepted_checks_sql;
--> statement-breakpoint
EXECUTE order_accepted_checks_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE order_accepted_checks_stmt;
