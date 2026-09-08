CREATE TABLE `damage_records` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`item_id` varchar(36) NOT NULL,
	`item_name` varchar(255) NOT NULL,
	`item_code` varchar(32) NOT NULL DEFAULT '',
	`source` varchar(32) NOT NULL,
	`source_name` varchar(255) NOT NULL DEFAULT '',
	`quantity` int NOT NULL DEFAULT 1,
	`selected_size` varchar(64),
	`selected_color` varchar(64),
	`status` varchar(32) NOT NULL DEFAULT 'damaged',
	`damage_reason` text,
	`current_location` varchar(255) NOT NULL DEFAULT '',
	`reported_by` varchar(255) NOT NULL DEFAULT '',
	`reported_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`fixed_at` datetime,
	`fixed_by` varchar(255),
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `damage_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `damage_records_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `items` ADD `purchase_price_usd` decimal(10,2);--> statement-breakpoint
ALTER TABLE `items` ADD `cost_breakdown` json;--> statement-breakpoint
ALTER TABLE `items` ADD `production_status` varchar(32) DEFAULT 'ready' NOT NULL;--> statement-breakpoint
CREATE INDEX `damage_records_item_id_idx` ON `damage_records` (`item_id`);--> statement-breakpoint
CREATE INDEX `damage_records_status_idx` ON `damage_records` (`status`);--> statement-breakpoint
CREATE INDEX `damage_records_is_deleted_idx` ON `damage_records` (`is_deleted`);