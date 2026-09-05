CREATE TABLE `user_addresses` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`label` varchar(64) NOT NULL DEFAULT '',
	`receiver_name` varchar(255) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`province` varchar(64) NOT NULL DEFAULT '',
	`city` varchar(128) NOT NULL DEFAULT '',
	`postal_code` varchar(16) NOT NULL DEFAULT '',
	`address` text NOT NULL,
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `user_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `province` varchar(64) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `postal_code` varchar(16) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `tracking_code` varchar(64);--> statement-breakpoint
ALTER TABLE `orders` ADD `delivered_at` datetime;--> statement-breakpoint
CREATE INDEX `user_addresses_user_id_idx` ON `user_addresses` (`user_id`);