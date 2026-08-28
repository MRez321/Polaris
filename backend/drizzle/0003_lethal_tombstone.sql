CREATE TABLE `website_settings` (
	`id` varchar(36) NOT NULL,
	`data` json NOT NULL,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `website_settings_id` PRIMARY KEY(`id`)
);
