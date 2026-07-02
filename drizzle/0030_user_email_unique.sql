-- User.email: enforce uniqueness at the DB level. The register route only checks
-- duplicates app-side (findFirst → insert), so two concurrent sign-ups with the
-- same email could both pass the check and insert. Password reset and email
-- verification resolve users by email with findFirst, so duplicate emails would
-- shadow one of the accounts. NULLs stay allowed (MySQL unique permits them).
--
-- NOTE: this fails if duplicate emails already exist. Find them first with:
--   SELECT email, COUNT(*) AS c FROM `User` WHERE email IS NOT NULL GROUP BY email HAVING c > 1;
SET @user_email_unique_exists := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'User' AND index_name = 'User_email_unique');
--> statement-breakpoint
SET @user_email_unique_sql := IF(@user_email_unique_exists = 0, 'ALTER TABLE `User` ADD CONSTRAINT `User_email_unique` UNIQUE (`email`)', 'SELECT 1');
--> statement-breakpoint
PREPARE user_email_unique_stmt FROM @user_email_unique_sql;
--> statement-breakpoint
EXECUTE user_email_unique_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE user_email_unique_stmt;
