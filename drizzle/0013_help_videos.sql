CREATE TABLE IF NOT EXISTS `HelpVideo` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `youtubeUrl` text NOT NULL,
  `videoId` varchar(32) NOT NULL,
  `sortOrder` int NOT NULL DEFAULT 0,
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` datetime NOT NULL DEFAULT now(),
  `updatedAt` datetime NOT NULL DEFAULT now() ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_help_video_active_sort` (`isActive`, `sortOrder`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
