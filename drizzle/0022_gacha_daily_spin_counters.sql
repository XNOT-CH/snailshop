CREATE TABLE IF NOT EXISTS `GachaDailySpinCounter` (
    `id` varchar(36) NOT NULL,
    `userId` varchar(36) NOT NULL,
    `machineScope` varchar(64) NOT NULL,
    `spinDate` varchar(10) NOT NULL,
    `spinCount` int NOT NULL DEFAULT 0,
    `createdAt` datetime NOT NULL DEFAULT now(),
    `updatedAt` datetime NOT NULL DEFAULT now(),
    CONSTRAINT `GachaDailySpinCounter_id` PRIMARY KEY (`id`),
    UNIQUE KEY `uq_gacha_daily_spin_counter_scope` (`userId`, `machineScope`, `spinDate`),
    KEY `idx_gacha_daily_spin_counter_date` (`spinDate`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
