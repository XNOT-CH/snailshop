CREATE TABLE `SeasonPassReward` (
	`id` varchar(36) NOT NULL,
	`planId` varchar(36) NOT NULL,
	`dayNumber` int NOT NULL,
	`rewardType` varchar(30) NOT NULL,
	`label` varchar(120) NOT NULL,
	`amount` varchar(50) NOT NULL,
	`highlight` boolean NOT NULL DEFAULT false,
	`creditReward` int,
	`pointReward` int,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()),
	CONSTRAINT `SeasonPassReward_id_pk` PRIMARY KEY(`id`),
	CONSTRAINT `uq_season_pass_reward_plan_day` UNIQUE(`planId`,`dayNumber`)
);
--> statement-breakpoint
ALTER TABLE `SeasonPassReward` ADD CONSTRAINT `SeasonPassReward_planId_SeasonPassPlan_id_fk` FOREIGN KEY (`planId`) REFERENCES `SeasonPassPlan`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `idx_season_pass_reward_plan_day` ON `SeasonPassReward` (`planId`,`dayNumber`);
