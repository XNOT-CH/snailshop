-- SiteSettings: footerDescription
SET @ss_footer_desc_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SiteSettings' AND column_name = 'footerDescription');
--> statement-breakpoint
SET @ss_footer_desc_sql := IF(@ss_footer_desc_exists = 0, 'ALTER TABLE `SiteSettings` ADD COLUMN `footerDescription` text', 'SELECT 1');
--> statement-breakpoint
PREPARE ss_footer_desc_stmt FROM @ss_footer_desc_sql;
--> statement-breakpoint
EXECUTE ss_footer_desc_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE ss_footer_desc_stmt;
--> statement-breakpoint

-- SiteSettings: contactPhone
SET @ss_phone_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SiteSettings' AND column_name = 'contactPhone');
--> statement-breakpoint
SET @ss_phone_sql := IF(@ss_phone_exists = 0, 'ALTER TABLE `SiteSettings` ADD COLUMN `contactPhone` varchar(50)', 'SELECT 1');
--> statement-breakpoint
PREPARE ss_phone_stmt FROM @ss_phone_sql;
--> statement-breakpoint
EXECUTE ss_phone_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE ss_phone_stmt;
--> statement-breakpoint

-- SiteSettings: contactEmail
SET @ss_email_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SiteSettings' AND column_name = 'contactEmail');
--> statement-breakpoint
SET @ss_email_sql := IF(@ss_email_exists = 0, 'ALTER TABLE `SiteSettings` ADD COLUMN `contactEmail` varchar(255)', 'SELECT 1');
--> statement-breakpoint
PREPARE ss_email_stmt FROM @ss_email_sql;
--> statement-breakpoint
EXECUTE ss_email_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE ss_email_stmt;
--> statement-breakpoint

-- SiteSettings: facebookUrl
SET @ss_fb_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SiteSettings' AND column_name = 'facebookUrl');
--> statement-breakpoint
SET @ss_fb_sql := IF(@ss_fb_exists = 0, 'ALTER TABLE `SiteSettings` ADD COLUMN `facebookUrl` text', 'SELECT 1');
--> statement-breakpoint
PREPARE ss_fb_stmt FROM @ss_fb_sql;
--> statement-breakpoint
EXECUTE ss_fb_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE ss_fb_stmt;
--> statement-breakpoint

-- SiteSettings: twitterUrl
SET @ss_tw_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SiteSettings' AND column_name = 'twitterUrl');
--> statement-breakpoint
SET @ss_tw_sql := IF(@ss_tw_exists = 0, 'ALTER TABLE `SiteSettings` ADD COLUMN `twitterUrl` text', 'SELECT 1');
--> statement-breakpoint
PREPARE ss_tw_stmt FROM @ss_tw_sql;
--> statement-breakpoint
EXECUTE ss_tw_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE ss_tw_stmt;
--> statement-breakpoint

-- SiteSettings: instagramUrl
SET @ss_ig_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SiteSettings' AND column_name = 'instagramUrl');
--> statement-breakpoint
SET @ss_ig_sql := IF(@ss_ig_exists = 0, 'ALTER TABLE `SiteSettings` ADD COLUMN `instagramUrl` text', 'SELECT 1');
--> statement-breakpoint
PREPARE ss_ig_stmt FROM @ss_ig_sql;
--> statement-breakpoint
EXECUTE ss_ig_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE ss_ig_stmt;
--> statement-breakpoint

-- SiteSettings: lineUrl
SET @ss_line_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SiteSettings' AND column_name = 'lineUrl');
--> statement-breakpoint
SET @ss_line_sql := IF(@ss_line_exists = 0, 'ALTER TABLE `SiteSettings` ADD COLUMN `lineUrl` text', 'SELECT 1');
--> statement-breakpoint
PREPARE ss_line_stmt FROM @ss_line_sql;
--> statement-breakpoint
EXECUTE ss_line_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE ss_line_stmt;
--> statement-breakpoint

-- FooterWidgetSettings: secondaryTitle
SET @fw_sec_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'FooterWidgetSettings' AND column_name = 'secondaryTitle');
--> statement-breakpoint
SET @fw_sec_sql := IF(@fw_sec_exists = 0, 'ALTER TABLE `FooterWidgetSettings` ADD COLUMN `secondaryTitle` varchar(100) NOT NULL DEFAULT ''บัตรเติมเกม''', 'SELECT 1');
--> statement-breakpoint
PREPARE fw_sec_stmt FROM @fw_sec_sql;
--> statement-breakpoint
EXECUTE fw_sec_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE fw_sec_stmt;
--> statement-breakpoint

-- FooterLink: column
SET @fl_col_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'FooterLink' AND column_name = 'column');
--> statement-breakpoint
SET @fl_col_sql := IF(@fl_col_exists = 0, 'ALTER TABLE `FooterLink` ADD COLUMN `column` varchar(20) NOT NULL DEFAULT ''services''', 'SELECT 1');
--> statement-breakpoint
PREPARE fl_col_stmt FROM @fl_col_sql;
--> statement-breakpoint
EXECUTE fl_col_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE fl_col_stmt;
