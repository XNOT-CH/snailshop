SET @welcome_strip_images_column_exists := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'SiteSettings'
      AND column_name = 'welcomeStripImagesJson'
);
--> statement-breakpoint
SET @welcome_strip_images_column_sql := IF(
    @welcome_strip_images_column_exists = 0,
    'ALTER TABLE `SiteSettings` ADD COLUMN `welcomeStripImagesJson` text',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE welcome_strip_images_column_stmt FROM @welcome_strip_images_column_sql;
--> statement-breakpoint
EXECUTE welcome_strip_images_column_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE welcome_strip_images_column_stmt;
