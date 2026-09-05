-- RegistrationPolicy: the TOS / privacy-policy clauses an admin writes for the
-- signup page. One row per clause; `type` is 'TOS' or 'PP' so both lists share
-- one table instead of two identical ones. The *En columns are nullable because
-- English is optional — the public pages fall back to the Thai text.
-- utf8mb4_unicode_ci matches the collation the existing tables use; the MySQL 8
-- server default (utf8mb4_0900_ai_ci) would break any later join on these ids.
-- Idempotent so it is safe to re-run.
CREATE TABLE IF NOT EXISTS `RegistrationPolicy` (
    `id` varchar(36) NOT NULL,
    `type` varchar(10) NOT NULL,
    `titleTh` varchar(255) NOT NULL,
    `titleEn` varchar(255) NULL,
    `contentTh` text NOT NULL,
    `contentEn` text NULL,
    `sortOrder` int NOT NULL DEFAULT 0,
    `isActive` tinyint(1) NOT NULL DEFAULT 1,
    `createdAt` datetime NOT NULL DEFAULT now(),
    `updatedAt` datetime NOT NULL DEFAULT now(),
    CONSTRAINT `RegistrationPolicy_id` PRIMARY KEY (`id`),
    KEY `idx_registration_policy_type_active_sort` (`type`, `isActive`, `sortOrder`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
