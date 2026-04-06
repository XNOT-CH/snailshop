ALTER TABLE `PromoCode`
    ADD COLUMN `usagePerUser` int NULL,
    ADD COLUMN `applicableCategories` json NULL,
    ADD COLUMN `excludedCategories` json NULL,
    ADD COLUMN `isNewUserOnly` boolean NOT NULL DEFAULT false;--> statement-breakpoint

CREATE TABLE `PromoUsage` (
    `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
    `promoCodeId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
    `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
    `orderId` varchar(191) COLLATE utf8mb4_unicode_ci NULL,
    `promoCode` varchar(50) NOT NULL,
    `discountAmount` decimal(10,2) NOT NULL,
    `status` varchar(20) NOT NULL DEFAULT 'COMPLETED',
    `createdAt` datetime NOT NULL DEFAULT (now()),
    `updatedAt` datetime NOT NULL DEFAULT (now()),
    CONSTRAINT `PromoUsage_id_pk` PRIMARY KEY(`id`),
    CONSTRAINT `PromoUsage_promoCodeId_PromoCode_id_fk`
        FOREIGN KEY (`promoCodeId`) REFERENCES `PromoCode`(`id`) ON DELETE cascade,
    CONSTRAINT `PromoUsage_userId_User_id_fk`
        FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade,
    CONSTRAINT `PromoUsage_orderId_Order_id_fk`
        FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE set null
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;--> statement-breakpoint

CREATE INDEX `idx_promousage_promo_user_status` ON `PromoUsage` (`promoCodeId`,`userId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_promousage_order` ON `PromoUsage` (`orderId`);
