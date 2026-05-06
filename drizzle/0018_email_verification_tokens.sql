CREATE TABLE `EmailVerificationToken` (
	`id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
	`userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
	`email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
	`tokenHash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
	`expiresAt` datetime NOT NULL,
	`usedAt` datetime,
	`createdAt` datetime NOT NULL DEFAULT now(),
	CONSTRAINT `EmailVerificationToken_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_email_verification_token_hash` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `EmailVerificationToken` ADD CONSTRAINT `EmailVerificationToken_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `idx_email_verification_user_email` ON `EmailVerificationToken` (`userId`,`email`);
--> statement-breakpoint
CREATE INDEX `idx_email_verification_expires` ON `EmailVerificationToken` (`expiresAt`);
