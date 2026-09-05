CREATE TABLE `notification_settings` (
	`id` varchar(36) NOT NULL,
	`data` json NOT NULL,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `notification_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `items` ADD `website_quantity` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `items_website_quantity_idx` ON `items` (`website_quantity`);