ALTER TABLE `User`
    MODIFY COLUMN `taxFullName` text NULL,
    MODIFY COLUMN `taxPhone` text NULL,
    MODIFY COLUMN `taxProvince` text NULL,
    MODIFY COLUMN `taxDistrict` text NULL,
    MODIFY COLUMN `taxSubdistrict` text NULL,
    MODIFY COLUMN `taxPostalCode` text NULL,
    MODIFY COLUMN `shipFullName` text NULL,
    MODIFY COLUMN `shipPhone` text NULL,
    MODIFY COLUMN `shipProvince` text NULL,
    MODIFY COLUMN `shipDistrict` text NULL,
    MODIFY COLUMN `shipSubdistrict` text NULL,
    MODIFY COLUMN `shipPostalCode` text NULL;--> statement-breakpoint

ALTER TABLE `Topup`
    MODIFY COLUMN `senderName` text NULL,
    MODIFY COLUMN `receiverName` text NULL,
    MODIFY COLUMN `receiverBank` text NULL;
