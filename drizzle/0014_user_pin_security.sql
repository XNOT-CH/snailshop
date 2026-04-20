ALTER TABLE `User`
    ADD COLUMN IF NOT EXISTS `pinHash` varchar(255) NULL AFTER `emailVerified`,
    ADD COLUMN IF NOT EXISTS `pinEnabledAt` datetime NULL AFTER `pinHash`,
    ADD COLUMN IF NOT EXISTS `pinUpdatedAt` datetime NULL AFTER `pinEnabledAt`,
    ADD COLUMN IF NOT EXISTS `pinFailedAttempts` int NOT NULL DEFAULT 0 AFTER `pinUpdatedAt`,
    ADD COLUMN IF NOT EXISTS `pinLockedUntil` datetime NULL AFTER `pinFailedAttempts`;
