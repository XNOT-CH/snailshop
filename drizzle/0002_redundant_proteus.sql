ALTER TABLE `Role` MODIFY COLUMN `permissions` json;--> statement-breakpoint
ALTER TABLE `SiteSettings` MODIFY COLUMN `heroTitle` varchar(255);--> statement-breakpoint
ALTER TABLE `SiteSettings` MODIFY COLUMN `heroDescription` text;--> statement-breakpoint
ALTER TABLE `User` MODIFY COLUMN `permissions` json;--> statement-breakpoint
ALTER TABLE `Product` ADD `autoDeleteAfterSale` int;--> statement-breakpoint
ALTER TABLE `Product` ADD `scheduledDeleteAt` datetime;--> statement-breakpoint
ALTER TABLE `SiteSettings` ADD `backgroundBlur` boolean DEFAULT true NOT NULL;