SET @user_address_profile_table_exists := (
    SELECT COUNT(*)
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'UserAddressProfile'
);
--> statement-breakpoint
SET @user_address_profile_table_sql := IF(
    @user_address_profile_table_exists = 0,
    'CREATE TABLE `UserAddressProfile` (
        `id` varchar(36) NOT NULL,
        `userId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        `label` varchar(100) NOT NULL,
        `kind` varchar(20) NOT NULL DEFAULT ''both'',
        `fullName` text,
        `phone` text,
        `address` text,
        `province` text,
        `district` text,
        `subdistrict` text,
        `postalCode` text,
        `taxId` text,
        `isDefaultTax` boolean NOT NULL DEFAULT false,
        `isDefaultShipping` boolean NOT NULL DEFAULT false,
        `createdAt` datetime NOT NULL DEFAULT now(),
        `updatedAt` datetime NOT NULL DEFAULT now(),
        CONSTRAINT `UserAddressProfile_id` PRIMARY KEY(`id`),
        CONSTRAINT `UserAddressProfile_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE user_address_profile_table_stmt FROM @user_address_profile_table_sql;
--> statement-breakpoint
EXECUTE user_address_profile_table_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE user_address_profile_table_stmt;

--> statement-breakpoint
SET @user_address_profile_user_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'UserAddressProfile'
      AND index_name = 'idx_user_address_profile_user'
);
--> statement-breakpoint
SET @user_address_profile_user_index_sql := IF(
    @user_address_profile_user_index_exists = 0,
    'CREATE INDEX `idx_user_address_profile_user` ON `UserAddressProfile` (`userId`)',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE user_address_profile_user_index_stmt FROM @user_address_profile_user_index_sql;
--> statement-breakpoint
EXECUTE user_address_profile_user_index_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE user_address_profile_user_index_stmt;

--> statement-breakpoint
SET @user_address_profile_kind_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'UserAddressProfile'
      AND index_name = 'idx_user_address_profile_user_kind'
);
--> statement-breakpoint
SET @user_address_profile_kind_index_sql := IF(
    @user_address_profile_kind_index_exists = 0,
    'CREATE INDEX `idx_user_address_profile_user_kind` ON `UserAddressProfile` (`userId`, `kind`)',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE user_address_profile_kind_index_stmt FROM @user_address_profile_kind_index_sql;
--> statement-breakpoint
EXECUTE user_address_profile_kind_index_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE user_address_profile_kind_index_stmt;

--> statement-breakpoint
SET @user_address_profile_default_tax_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'UserAddressProfile'
      AND index_name = 'idx_user_address_profile_default_tax'
);
--> statement-breakpoint
SET @user_address_profile_default_tax_index_sql := IF(
    @user_address_profile_default_tax_index_exists = 0,
    'CREATE INDEX `idx_user_address_profile_default_tax` ON `UserAddressProfile` (`userId`, `isDefaultTax`)',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE user_address_profile_default_tax_index_stmt FROM @user_address_profile_default_tax_index_sql;
--> statement-breakpoint
EXECUTE user_address_profile_default_tax_index_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE user_address_profile_default_tax_index_stmt;

--> statement-breakpoint
SET @user_address_profile_default_shipping_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'UserAddressProfile'
      AND index_name = 'idx_user_address_profile_default_shipping'
);
--> statement-breakpoint
SET @user_address_profile_default_shipping_index_sql := IF(
    @user_address_profile_default_shipping_index_exists = 0,
    'CREATE INDEX `idx_user_address_profile_default_shipping` ON `UserAddressProfile` (`userId`, `isDefaultShipping`)',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE user_address_profile_default_shipping_index_stmt FROM @user_address_profile_default_shipping_index_sql;
--> statement-breakpoint
EXECUTE user_address_profile_default_shipping_index_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE user_address_profile_default_shipping_index_stmt;

--> statement-breakpoint
INSERT INTO `UserAddressProfile` (
    `id`, `userId`, `label`, `kind`, `fullName`, `phone`, `address`, `province`,
    `district`, `subdistrict`, `postalCode`, `isDefaultTax`, `isDefaultShipping`
)
SELECT UUID(), `id`, 'ที่อยู่ออกใบกำกับภาษีเดิม', 'tax', `taxFullName`, `taxPhone`, `taxAddress`,
    `taxProvince`, `taxDistrict`, `taxSubdistrict`, `taxPostalCode`, true, false
FROM `User`
WHERE (`taxFullName` IS NOT NULL OR `taxPhone` IS NOT NULL OR `taxAddress` IS NOT NULL
    OR `taxProvince` IS NOT NULL OR `taxDistrict` IS NOT NULL OR `taxSubdistrict` IS NOT NULL
    OR `taxPostalCode` IS NOT NULL)
  AND NOT EXISTS (
      SELECT 1 FROM `UserAddressProfile`
      WHERE `UserAddressProfile`.`userId` = `User`.`id`
        AND `UserAddressProfile`.`kind` = 'tax'
        AND `UserAddressProfile`.`label` = 'ที่อยู่ออกใบกำกับภาษีเดิม'
  );

--> statement-breakpoint
INSERT INTO `UserAddressProfile` (
    `id`, `userId`, `label`, `kind`, `fullName`, `phone`, `address`, `province`,
    `district`, `subdistrict`, `postalCode`, `isDefaultTax`, `isDefaultShipping`
)
SELECT UUID(), `id`, 'ที่อยู่จัดส่งเดิม', 'shipping', `shipFullName`, `shipPhone`, `shipAddress`,
    `shipProvince`, `shipDistrict`, `shipSubdistrict`, `shipPostalCode`, false, true
FROM `User`
WHERE (`shipFullName` IS NOT NULL OR `shipPhone` IS NOT NULL OR `shipAddress` IS NOT NULL
    OR `shipProvince` IS NOT NULL OR `shipDistrict` IS NOT NULL OR `shipSubdistrict` IS NOT NULL
    OR `shipPostalCode` IS NOT NULL)
  AND NOT EXISTS (
      SELECT 1 FROM `UserAddressProfile`
      WHERE `UserAddressProfile`.`userId` = `User`.`id`
        AND `UserAddressProfile`.`kind` = 'shipping'
        AND `UserAddressProfile`.`label` = 'ที่อยู่จัดส่งเดิม'
  );
