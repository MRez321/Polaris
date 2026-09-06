ALTER TABLE `items` ADD `description` text;--> statement-breakpoint
ALTER TABLE `items` ADD `variant_prices` json;--> statement-breakpoint
ALTER TABLE `staff` ADD `address` varchar(512);