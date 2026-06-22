-- Order: productId snapshot
SET @ord_pid_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Order' AND column_name = 'productId');
--> statement-breakpoint
SET @ord_pid_sql := IF(@ord_pid_exists = 0, 'ALTER TABLE `Order` ADD COLUMN `productId` varchar(36)', 'SELECT 1');
--> statement-breakpoint
PREPARE ord_pid_stmt FROM @ord_pid_sql;
--> statement-breakpoint
EXECUTE ord_pid_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE ord_pid_stmt;
--> statement-breakpoint

-- Order: productName snapshot
SET @ord_pname_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Order' AND column_name = 'productName');
--> statement-breakpoint
SET @ord_pname_sql := IF(@ord_pname_exists = 0, 'ALTER TABLE `Order` ADD COLUMN `productName` varchar(255)', 'SELECT 1');
--> statement-breakpoint
PREPARE ord_pname_stmt FROM @ord_pname_sql;
--> statement-breakpoint
EXECUTE ord_pname_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE ord_pname_stmt;
--> statement-breakpoint

-- Order: productImage snapshot
SET @ord_pimg_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Order' AND column_name = 'productImage');
--> statement-breakpoint
SET @ord_pimg_sql := IF(@ord_pimg_exists = 0, 'ALTER TABLE `Order` ADD COLUMN `productImage` varchar(500)', 'SELECT 1');
--> statement-breakpoint
PREPARE ord_pimg_stmt FROM @ord_pimg_sql;
--> statement-breakpoint
EXECUTE ord_pimg_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE ord_pimg_stmt;
