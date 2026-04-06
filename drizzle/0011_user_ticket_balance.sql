ALTER TABLE `User`
ADD COLUMN `ticketBalance` int NOT NULL DEFAULT 0 AFTER `pointBalance`;
