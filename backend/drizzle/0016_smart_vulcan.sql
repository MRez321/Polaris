CREATE TABLE `two_factor` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`secret` varchar(512) NOT NULL,
	`backup_codes` varchar(1024) NOT NULL,
	`verified` boolean NOT NULL DEFAULT true,
	`failed_verification_count` int NOT NULL DEFAULT 0,
	`locked_until` datetime,
	CONSTRAINT `two_factor_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user` ADD `two_factor_enabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `two_factor_user_id_idx` ON `two_factor` (`user_id`);