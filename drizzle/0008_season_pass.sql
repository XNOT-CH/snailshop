CREATE TABLE `SeasonPassPlan` (
    `id` varchar(36) NOT NULL,
    `slug` varchar(100) NOT NULL,
    `name` varchar(255) NOT NULL,
    `description` text NULL,
    `price` decimal(10,2) NOT NULL,
    `durationDays` int NOT NULL DEFAULT 30,
    `isActive` boolean NOT NULL DEFAULT true,
    `createdAt` datetime NOT NULL DEFAULT (now()),
    `updatedAt` datetime NOT NULL DEFAULT (now()),
    CONSTRAINT `SeasonPassPlan_id_pk` PRIMARY KEY(`id`),
    CONSTRAINT `SeasonPassPlan_slug_unique` UNIQUE(`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;--> statement-breakpoint

CREATE TABLE `SeasonPassSubscription` (
    `id` varchar(36) NOT NULL,
    `userId` varchar(36) NOT NULL,
    `planId` varchar(36) NOT NULL,
    `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
    `startAt` datetime NOT NULL DEFAULT (now()),
    `endAt` datetime NOT NULL,
    `createdAt` datetime NOT NULL DEFAULT (now()),
    `updatedAt` datetime NOT NULL DEFAULT (now()),
    CONSTRAINT `SeasonPassSubscription_id_pk` PRIMARY KEY(`id`),
    CONSTRAINT `SeasonPassSubscription_userId_User_id_fk`
        FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade,
    CONSTRAINT `SeasonPassSubscription_planId_SeasonPassPlan_id_fk`
        FOREIGN KEY (`planId`) REFERENCES `SeasonPassPlan`(`id`) ON DELETE restrict
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;--> statement-breakpoint

CREATE TABLE `SeasonPassClaim` (
    `id` varchar(36) NOT NULL,
    `subscriptionId` varchar(36) NOT NULL,
    `userId` varchar(36) NOT NULL,
    `dayNumber` int NOT NULL,
    `claimDateKey` varchar(10) NOT NULL,
    `rewardType` varchar(30) NOT NULL,
    `rewardLabel` varchar(120) NOT NULL,
    `rewardAmount` varchar(50) NOT NULL,
    `rewardPayload` json NULL,
    `createdAt` datetime NOT NULL DEFAULT (now()),
    CONSTRAINT `SeasonPassClaim_id_pk` PRIMARY KEY(`id`),
    CONSTRAINT `SeasonPassClaim_subscriptionId_SeasonPassSubscription_id_fk`
        FOREIGN KEY (`subscriptionId`) REFERENCES `SeasonPassSubscription`(`id`) ON DELETE cascade,
    CONSTRAINT `SeasonPassClaim_userId_User_id_fk`
        FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;--> statement-breakpoint

CREATE INDEX `idx_season_pass_plan_active` ON `SeasonPassPlan` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_season_pass_subscription_user_status` ON `SeasonPassSubscription` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_season_pass_subscription_endAt` ON `SeasonPassSubscription` (`endAt`);--> statement-breakpoint
CREATE INDEX `idx_season_pass_claim_user_created` ON `SeasonPassClaim` (`userId`,`createdAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_season_pass_claim_subscription_day` ON `SeasonPassClaim` (`subscriptionId`,`dayNumber`);
