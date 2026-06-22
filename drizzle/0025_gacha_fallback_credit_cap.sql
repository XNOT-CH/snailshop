-- GachaMachine: fallbackCreditCap (0 = unlimited / pay full product price)
SET @gm_fcc_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'GachaMachine' AND column_name = 'fallbackCreditCap');
--> statement-breakpoint
SET @gm_fcc_sql := IF(@gm_fcc_exists = 0, 'ALTER TABLE `GachaMachine` ADD COLUMN `fallbackCreditCap` decimal(10,2) NOT NULL DEFAULT ''0''', 'SELECT 1');
--> statement-breakpoint
PREPARE gm_fcc_stmt FROM @gm_fcc_sql;
--> statement-breakpoint
EXECUTE gm_fcc_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE gm_fcc_stmt;
--> statement-breakpoint

-- GachaSettings: fallbackCreditCap (0 = unlimited / pay full product price)
SET @gs_fcc_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'GachaSettings' AND column_name = 'fallbackCreditCap');
--> statement-breakpoint
SET @gs_fcc_sql := IF(@gs_fcc_exists = 0, 'ALTER TABLE `GachaSettings` ADD COLUMN `fallbackCreditCap` decimal(10,2) NOT NULL DEFAULT ''0''', 'SELECT 1');
--> statement-breakpoint
PREPARE gs_fcc_stmt FROM @gs_fcc_sql;
--> statement-breakpoint
EXECUTE gs_fcc_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE gs_fcc_stmt;
