-- P0-D 0022: Unified sales channels, orders, customers, seller sales, payments, and seller commissions.
-- Extends the empty P0-B stubs (sales_channels, customers, sales_orders, sales_order_lines,
-- sales_payments) to the full P0-D model. All stub tables are EMPTY — no data migration needed.
-- Columns are added/renamed to match the extended Drizzle schema in newModel.ts + schema/sales.ts.
-- No existing production data is touched; no tables dropped or renamed.

-- === sales_channels: extend with description, sort_order, updated_at ===
ALTER TABLE `sales_channels` ADD COLUMN `description` text;
--> statement-breakpoint
ALTER TABLE `sales_channels` ADD COLUMN `sort_order` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `sales_channels` ADD COLUMN `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;
--> statement-breakpoint

-- === customers: rename full_name -> name, add P0-D fields + indexes ===
ALTER TABLE `customers` CHANGE COLUMN `full_name` `name` varchar(255) NOT NULL;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `email` varchar(255);
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `province` varchar(64);
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `city` varchar(128);
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `postal_code` varchar(16);
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `credit_limit` bigint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `current_debt` bigint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `total_purchases` bigint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `order_count` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `first_order_at` datetime;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `last_order_at` datetime;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `acquisition_channel_id` varchar(36);
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `tags` json;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `notes` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `is_active` boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `is_deleted` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `deleted_at` datetime;
--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `deleted_by` varchar(36);
--> statement-breakpoint
CREATE INDEX `customers_phone_idx` ON `customers` (`phone`);
--> statement-breakpoint
CREATE INDEX `customers_name_idx` ON `customers` (`name`);
--> statement-breakpoint
CREATE INDEX `customers_active_idx` ON `customers` (`is_active`);
--> statement-breakpoint
CREATE INDEX `customers_is_deleted_idx` ON `customers` (`is_deleted`);
--> statement-breakpoint

-- === seller_sales: new table for seller actual sales ===
CREATE TABLE `seller_sales` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`seller_id` varchar(36) NOT NULL,
	`channel_id` varchar(36) NOT NULL,
	`sale_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`subtotal` bigint NOT NULL DEFAULT 0,
	`commission_amount` bigint NOT NULL DEFAULT 0,
	`net_settlement_amount` bigint NOT NULL DEFAULT 0,
	`settled_amount` bigint NOT NULL DEFAULT 0,
	`remaining_settlement` bigint NOT NULL DEFAULT 0,
	`note` text,
	`submitted_by` varchar(36),
	`confirmed_by` varchar(36),
	`confirmed_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `seller_sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `seller_sales_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `seller_sales` ADD CONSTRAINT `seller_sales_seller_id_fk` FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE `seller_sales` ADD CONSTRAINT `seller_sales_channel_id_fk` FOREIGN KEY (`channel_id`) REFERENCES `sales_channels`(`id`) ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX `seller_sales_seller_id_idx` ON `seller_sales` (`seller_id`);
--> statement-breakpoint
CREATE INDEX `seller_sales_channel_id_idx` ON `seller_sales` (`channel_id`);
--> statement-breakpoint
CREATE INDEX `seller_sales_code_idx` ON `seller_sales` (`code`);
--> statement-breakpoint
CREATE INDEX `seller_sales_status_idx` ON `seller_sales` (`status`);
--> statement-breakpoint
CREATE INDEX `seller_sales_sale_date_idx` ON `seller_sales` (`sale_date`);
--> statement-breakpoint
CREATE INDEX `seller_sales_is_deleted_idx` ON `seller_sales` (`is_deleted`);
--> statement-breakpoint

-- === sellers: add P0-D commission + settlement fields ===
ALTER TABLE `sellers` ADD COLUMN `commission_type` varchar(32) NOT NULL DEFAULT 'percentage';
--> statement-breakpoint
ALTER TABLE `sellers` ADD COLUMN `commission_rate` decimal(5,2) NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `sellers` ADD COLUMN `settlement_cycle_days` int NOT NULL DEFAULT 7;
--> statement-breakpoint
ALTER TABLE `sellers` ADD COLUMN `last_settlement_at` datetime;
--> statement-breakpoint

-- === sales_orders: add P0-D fields ===
ALTER TABLE `sales_orders` ADD COLUMN `order_type` varchar(32) NOT NULL DEFAULT 'retail';
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `seller_id` varchar(36);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `customer_name` varchar(255);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `customer_phone` varchar(32);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `customer_address` text;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `payment_status` varchar(32) NOT NULL DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `subtotal` bigint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `discount_amount` bigint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `shipping_amount` bigint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `tax_amount` bigint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `paid_amount` bigint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `remaining_amount` bigint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `currency` varchar(8) NOT NULL DEFAULT 'IRT';
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `total_amount` bigint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `source_reference` varchar(255);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `utm_source` varchar(128);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `utm_medium` varchar(128);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `utm_campaign` varchar(128);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `tracking_code` varchar(128);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `confirmed_at` datetime;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `paid_at` datetime;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `shipped_at` datetime;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `delivered_at` datetime;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `cancelled_at` datetime;
--> statement-breakpoint
ALTER TABLE `sales_orders` CHANGE COLUMN `actor_id` `created_by` varchar(36);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `is_deleted` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `deleted_at` datetime;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD COLUMN `deleted_by` varchar(36);
--> statement-breakpoint
CREATE INDEX `sales_orders_payment_status_idx` ON `sales_orders` (`payment_status`);
--> statement-breakpoint
CREATE INDEX `sales_orders_customer_id_idx` ON `sales_orders` (`customer_id`);
--> statement-breakpoint
CREATE INDEX `sales_orders_seller_id_idx` ON `sales_orders` (`seller_id`);
--> statement-breakpoint
CREATE INDEX `sales_orders_is_deleted_idx` ON `sales_orders` (`is_deleted`);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_seller_id_fk` FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint

-- === sales_order_lines: extend with item snapshot fields, make sku_id nullable ===
ALTER TABLE `sales_order_lines` DROP INDEX `sales_order_lines_sku_id_idx`;
--> statement-breakpoint
ALTER TABLE `sales_order_lines` MODIFY `sku_id` varchar(36);
--> statement-breakpoint
ALTER TABLE `sales_order_lines` ADD COLUMN `item_id` varchar(36);
--> statement-breakpoint
ALTER TABLE `sales_order_lines` ADD COLUMN `sku` varchar(64);
--> statement-breakpoint
ALTER TABLE `sales_order_lines` ADD COLUMN `item_code` varchar(32);
--> statement-breakpoint
ALTER TABLE `sales_order_lines` ADD COLUMN `item_name` varchar(255);
--> statement-breakpoint
ALTER TABLE `sales_order_lines` ADD COLUMN `size` varchar(64);
--> statement-breakpoint
ALTER TABLE `sales_order_lines` ADD COLUMN `color` varchar(64);
--> statement-breakpoint
ALTER TABLE `sales_order_lines` ADD COLUMN `discount_amount` bigint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `sales_order_lines` ADD COLUMN `line_total` bigint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `sales_order_lines` ADD COLUMN `snapshot` json;
--> statement-breakpoint
ALTER TABLE `sales_order_lines` ADD COLUMN `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;
--> statement-breakpoint
CREATE INDEX `sales_order_lines_item_id_idx` ON `sales_order_lines` (`item_id`);
--> statement-breakpoint
ALTER TABLE `sales_order_lines` ADD CONSTRAINT `sales_order_lines_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint

-- === seller_sale_lines: new table for seller sale line items ===
CREATE TABLE `seller_sale_lines` (
	`id` varchar(36) NOT NULL,
	`seller_sale_id` varchar(36) NOT NULL,
	`item_id` varchar(36),
	`item_code` varchar(32),
	`item_name` varchar(255),
	`size` varchar(64),
	`color` varchar(64),
	`quantity` int NOT NULL,
	`unit_price` bigint NOT NULL,
	`line_total` bigint NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `seller_sale_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `seller_sale_lines_sale_id_idx` ON `seller_sale_lines` (`seller_sale_id`);
--> statement-breakpoint
CREATE INDEX `seller_sale_lines_item_id_idx` ON `seller_sale_lines` (`item_id`);
--> statement-breakpoint
ALTER TABLE `seller_sale_lines` ADD CONSTRAINT `seller_sale_lines_sale_id_fk` FOREIGN KEY (`seller_sale_id`) REFERENCES `seller_sales`(`id`) ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint

-- === sales_payments: extend to support flexible targets (orderId | sellerSaleId) ===
-- Drop existing FK + index on the old sales_order_id column (to be renamed to order_id).
ALTER TABLE `sales_payments` DROP FOREIGN KEY `sales_payments_order_id_fk`;
--> statement-breakpoint
ALTER TABLE `sales_payments` DROP INDEX `sales_payments_order_id_idx`;
--> statement-breakpoint
-- Rename columns: sales_order_id -> order_id (nullable), method -> payment_method,
-- paid_at -> payment_date, actor_id -> created_by.
ALTER TABLE `sales_payments` CHANGE COLUMN `sales_order_id` `order_id` varchar(36) NULL;
--> statement-breakpoint
ALTER TABLE `sales_payments` CHANGE COLUMN `method` `payment_method` varchar(32);
--> statement-breakpoint
ALTER TABLE `sales_payments` CHANGE COLUMN `paid_at` `payment_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;
--> statement-breakpoint
ALTER TABLE `sales_payments` CHANGE COLUMN `actor_id` `created_by` varchar(36);
--> statement-breakpoint
-- Add P0-D columns.
ALTER TABLE `sales_payments` ADD COLUMN `code` varchar(32);
--> statement-breakpoint
ALTER TABLE `sales_payments` ADD COLUMN `seller_sale_id` varchar(36);
--> statement-breakpoint
ALTER TABLE `sales_payments` ADD COLUMN `customer_id` varchar(36);
--> statement-breakpoint
ALTER TABLE `sales_payments` ADD COLUMN `seller_id` varchar(36);
--> statement-breakpoint
ALTER TABLE `sales_payments` ADD COLUMN `tracking_number` varchar(255);
--> statement-breakpoint
ALTER TABLE `sales_payments` ADD COLUMN `status` varchar(32) NOT NULL DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE `sales_payments` ADD COLUMN `note` text;
--> statement-breakpoint
ALTER TABLE `sales_payments` ADD COLUMN `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;
--> statement-breakpoint
ALTER TABLE `sales_payments` ADD COLUMN `is_deleted` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `sales_payments` ADD COLUMN `deleted_at` datetime;
--> statement-breakpoint
ALTER TABLE `sales_payments` ADD COLUMN `deleted_by` varchar(36);
--> statement-breakpoint
-- Unique code + new FKs + indexes.
ALTER TABLE `sales_payments` ADD CONSTRAINT `sales_payments_code_unique` UNIQUE(`code`);
--> statement-breakpoint
ALTER TABLE `sales_payments` ADD CONSTRAINT `sales_payments_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `sales_orders`(`id`) ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE `sales_payments` ADD CONSTRAINT `sales_payments_seller_sale_id_fk` FOREIGN KEY (`seller_sale_id`) REFERENCES `seller_sales`(`id`) ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE `sales_payments` ADD CONSTRAINT `sales_payments_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE `sales_payments` ADD CONSTRAINT `sales_payments_seller_id_fk` FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX `sales_payments_order_id_idx` ON `sales_payments` (`order_id`);
--> statement-breakpoint
CREATE INDEX `sales_payments_seller_sale_id_idx` ON `sales_payments` (`seller_sale_id`);
--> statement-breakpoint
CREATE INDEX `sales_payments_customer_id_idx` ON `sales_payments` (`customer_id`);
--> statement-breakpoint
CREATE INDEX `sales_payments_seller_id_idx` ON `sales_payments` (`seller_id`);
--> statement-breakpoint
CREATE INDEX `sales_payments_status_idx` ON `sales_payments` (`status`);
--> statement-breakpoint
CREATE INDEX `sales_payments_payment_date_idx` ON `sales_payments` (`payment_date`)
