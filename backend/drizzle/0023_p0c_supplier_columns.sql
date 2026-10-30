-- P0-C 0023: Extended supplier fields for redesigned supplier management
-- Adds shop_name, contact_persons, phones, city, categories, isActive, and extended
-- metadata columns (email, address, cooperation_terms, payment_terms, payment_due_days,
-- min_order_amount) to the suppliers table.
-- The legacy `name` and `phone` columns are retained for backward compatibility.
-- New columns are nullable/optional where appropriate; shopName is populated on insert.

-- === suppliers: add new columns ===
ALTER TABLE `suppliers` ADD COLUMN `shop_name` varchar(255) DEFAULT '' NOT NULL AFTER `name`;
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `contact_persons` json DEFAULT NULL AFTER `shop_name`;
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `phones` json DEFAULT NULL AFTER `contact_persons`;
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `city` varchar(128) DEFAULT NULL AFTER `phones`;
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `categories` json DEFAULT NULL AFTER `city`;
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `is_active` boolean NOT NULL DEFAULT TRUE AFTER `categories`;
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `email` varchar(255) DEFAULT NULL AFTER `is_active`;
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `address` varchar(512) DEFAULT NULL AFTER `email`;
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `cooperation_terms` text DEFAULT NULL AFTER `address`;
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `payment_terms` varchar(255) DEFAULT NULL AFTER `cooperation_terms`;
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `payment_due_days` int DEFAULT NULL AFTER `payment_terms`;
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `min_order_amount` bigint DEFAULT NULL AFTER `payment_due_days`;
--> statement-breakpoint

-- === Indexes ===
ALTER TABLE `suppliers` ADD INDEX `suppliers_shop_name_idx` (`shop_name`);
--> statement-breakpoint
ALTER TABLE `suppliers` ADD INDEX `suppliers_city_idx` (`city`);
--> statement-breakpoint
ALTER TABLE `suppliers` ADD INDEX `suppliers_active_idx` (`is_active`);
--> statement-breakpoint

-- === Backfill: populate shop_name from legacy name for existing suppliers ===
UPDATE `suppliers` SET `shop_name` = `name` WHERE `shop_name` = '';
