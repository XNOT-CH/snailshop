UPDATE `ApiKey`
SET `permissions` = NULL
WHERE `permissions` IS NOT NULL
  AND JSON_VALID(`permissions`) = 0;--> statement-breakpoint
ALTER TABLE `ApiKey` MODIFY COLUMN `permissions` json;--> statement-breakpoint
ALTER TABLE `FooterWidgetSettings` MODIFY COLUMN `id` varchar(191) NOT NULL DEFAULT 'default';--> statement-breakpoint
ALTER TABLE `SiteSettings` MODIFY COLUMN `id` varchar(191) NOT NULL DEFAULT 'default';--> statement-breakpoint
SET @has_banners_json := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'SiteSettings'
      AND COLUMN_NAME = 'bannersJson'
);--> statement-breakpoint
SET @sql := IF(@has_banners_json = 0, 'ALTER TABLE `SiteSettings` ADD `bannersJson` text', 'SELECT 1');--> statement-breakpoint
PREPARE stmt FROM @sql;--> statement-breakpoint
EXECUTE stmt;--> statement-breakpoint
DEALLOCATE PREPARE stmt;--> statement-breakpoint
INSERT INTO `FooterWidgetSettings` (`id`, `isActive`, `title`, `createdAt`, `updatedAt`)
SELECT 'default', `isActive`, `title`, `createdAt`, `updatedAt`
FROM (
    SELECT `isActive`, `title`, `createdAt`, `updatedAt`
    FROM `FooterWidgetSettings`
    ORDER BY `updatedAt` DESC, `createdAt` DESC
    LIMIT 1
) AS `latest_footer_widget_settings`
ON DUPLICATE KEY UPDATE
    `isActive` = VALUES(`isActive`),
    `title` = VALUES(`title`),
    `createdAt` = VALUES(`createdAt`),
    `updatedAt` = VALUES(`updatedAt`);--> statement-breakpoint
DELETE FROM `FooterWidgetSettings` WHERE `id` <> 'default';--> statement-breakpoint
INSERT INTO `SiteSettings` (
    `id`,
    `heroTitle`,
    `heroDescription`,
    `announcement`,
    `bannerImage1`,
    `bannerTitle1`,
    `bannerSubtitle1`,
    `bannerImage2`,
    `bannerTitle2`,
    `bannerSubtitle2`,
    `bannerImage3`,
    `bannerTitle3`,
    `bannerSubtitle3`,
    `bannersJson`,
    `logoUrl`,
    `backgroundImage`,
    `backgroundBlur`,
    `showAllProducts`,
    `createdAt`,
    `updatedAt`
)
SELECT
    'default',
    `heroTitle`,
    `heroDescription`,
    `announcement`,
    `bannerImage1`,
    `bannerTitle1`,
    `bannerSubtitle1`,
    `bannerImage2`,
    `bannerTitle2`,
    `bannerSubtitle2`,
    `bannerImage3`,
    `bannerTitle3`,
    `bannerSubtitle3`,
    `bannersJson`,
    `logoUrl`,
    `backgroundImage`,
    `backgroundBlur`,
    `showAllProducts`,
    `createdAt`,
    `updatedAt`
FROM (
    SELECT
        `heroTitle`,
        `heroDescription`,
        `announcement`,
        `bannerImage1`,
        `bannerTitle1`,
        `bannerSubtitle1`,
        `bannerImage2`,
        `bannerTitle2`,
        `bannerSubtitle2`,
        `bannerImage3`,
        `bannerTitle3`,
        `bannerSubtitle3`,
        `bannersJson`,
        `logoUrl`,
        `backgroundImage`,
        `backgroundBlur`,
        `showAllProducts`,
        `createdAt`,
        `updatedAt`
    FROM `SiteSettings`
    ORDER BY `updatedAt` DESC, `createdAt` DESC
    LIMIT 1
) AS `latest_site_settings`
ON DUPLICATE KEY UPDATE
    `heroTitle` = VALUES(`heroTitle`),
    `heroDescription` = VALUES(`heroDescription`),
    `announcement` = VALUES(`announcement`),
    `bannerImage1` = VALUES(`bannerImage1`),
    `bannerTitle1` = VALUES(`bannerTitle1`),
    `bannerSubtitle1` = VALUES(`bannerSubtitle1`),
    `bannerImage2` = VALUES(`bannerImage2`),
    `bannerTitle2` = VALUES(`bannerTitle2`),
    `bannerSubtitle2` = VALUES(`bannerSubtitle2`),
    `bannerImage3` = VALUES(`bannerImage3`),
    `bannerTitle3` = VALUES(`bannerTitle3`),
    `bannerSubtitle3` = VALUES(`bannerSubtitle3`),
    `bannersJson` = VALUES(`bannersJson`),
    `logoUrl` = VALUES(`logoUrl`),
    `backgroundImage` = VALUES(`backgroundImage`),
    `backgroundBlur` = VALUES(`backgroundBlur`),
    `showAllProducts` = VALUES(`showAllProducts`),
    `createdAt` = VALUES(`createdAt`),
    `updatedAt` = VALUES(`updatedAt`);--> statement-breakpoint
DELETE FROM `SiteSettings` WHERE `id` <> 'default';--> statement-breakpoint
CREATE INDEX `idx_popup_active_sort_created` ON `AnnouncementPopup` (`isActive`,`sortOrder`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_footer_link_active_sort` ON `FooterLink` (`isActive`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `idx_gacha_machine_active_enabled_sort` ON `GachaMachine` (`isActive`,`isEnabled`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `idx_gacha_reward_machine_active_created` ON `GachaReward` (`gachaMachineId`,`isActive`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_help_article_active_category_sort` ON `HelpArticle` (`isActive`,`category`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `idx_nav_item_active_sort` ON `NavItem` (`isActive`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `idx_news_article_active_sort_created` ON `NewsArticle` (`isActive`,`sortOrder`,`createdAt`);--> statement-breakpoint
ALTER TABLE `User` DROP COLUMN `permissions`;
