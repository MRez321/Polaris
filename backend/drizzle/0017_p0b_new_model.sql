-- P0-B 0017 new-model tables + audit enrichment + legacy deleted_by: see docs/superpowers/specs/2026-09-14-p0b-architecture-design.md
-- DO NOT EDIT: generated from schema, hand-split per migration strategy

CREATE TABLE `customers` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32),
	`full_name` varchar(255) NOT NULL,
	`phone` varchar(32),
	`address` varchar(512),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `financial_transactions` (
	`id` varchar(36) NOT NULL,
	`txn_type` varchar(32) NOT NULL,
	`direction` int NOT NULL,
	`amount` bigint NOT NULL,
	`counterparty_type` varchar(32),
	`counterparty_id` varchar(36),
	`reference_type` varchar(64),
	`reference_id` varchar(64),
	`description` varchar(512),
	`actor_id` varchar(36),
	`occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `financial_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_ledger` (
	`id` varchar(36) NOT NULL,
	`sku_id` varchar(36) NOT NULL,
	`location_id` varchar(36) NOT NULL,
	`movement_type` varchar(32) NOT NULL,
	`quantity_delta` int NOT NULL,
	`unit_cost` bigint,
	`reference_type` varchar(64) NOT NULL,
	`reference_id` varchar(64) NOT NULL,
	`reason` varchar(255),
	`actor_id` varchar(36),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` varchar(36) NOT NULL,
	`warehouse_id` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `locations_warehouse_code_uk` UNIQUE(`warehouse_id`,`code`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`attributes` json,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category_id` varchar(64),
	`description` text,
	`image_url` varchar(512),
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_items` (
	`id` varchar(36) NOT NULL,
	`purchase_id` varchar(36) NOT NULL,
	`sku_id` varchar(36) NOT NULL,
	`quantity` int NOT NULL,
	`unit_cost` bigint NOT NULL,
	`received_quantity` int NOT NULL DEFAULT 0,
	CONSTRAINT `purchase_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32),
	`supplier_id` varchar(36) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`total_amount` bigint NOT NULL DEFAULT 0,
	`note` text,
	`actor_id` varchar(36),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `purchases_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchases_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `sales_channels` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(128) NOT NULL,
	`type` varchar(32) NOT NULL DEFAULT 'store',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sales_channels_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_channels_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `sales_order_lines` (
	`id` varchar(36) NOT NULL,
	`sales_order_id` varchar(36) NOT NULL,
	`sku_id` varchar(36) NOT NULL,
	`quantity` int NOT NULL,
	`unit_price` bigint NOT NULL,
	`line_total` bigint NOT NULL,
	CONSTRAINT `sales_order_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_orders` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32),
	`channel_id` varchar(36) NOT NULL,
	`customer_id` varchar(36),
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`total_amount` bigint NOT NULL DEFAULT 0,
	`note` text,
	`actor_id` varchar(36),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `sales_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_orders_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `sales_payments` (
	`id` varchar(36) NOT NULL,
	`sales_order_id` varchar(36) NOT NULL,
	`amount` bigint NOT NULL,
	`method` varchar(32),
	`paid_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`actor_id` varchar(36),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sales_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settlements` (
	`id` varchar(36) NOT NULL,
	`counterparty_type` varchar(32) NOT NULL,
	`counterparty_id` varchar(36) NOT NULL,
	`amount` bigint NOT NULL,
	`note` varchar(512),
	`actor_id` varchar(36),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `settlements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sku_locations` (
	`sku_id` varchar(36) NOT NULL,
	`location_id` varchar(36) NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	CONSTRAINT `sku_locations_sku_id_location_id_pk` PRIMARY KEY(`sku_id`,`location_id`)
);
--> statement-breakpoint
CREATE TABLE `skus` (
	`id` varchar(36) NOT NULL,
	`product_variant_id` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`barcode` varchar(64),
	`name` varchar(255),
	`cost_price` bigint NOT NULL DEFAULT 0,
	`sale_price` bigint NOT NULL DEFAULT 0,
	`min_stock_threshold` int NOT NULL DEFAULT 0,
	`legacy_item_id` varchar(36),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `skus_id` PRIMARY KEY(`id`),
	CONSTRAINT `skus_code_unique` UNIQUE(`code`),
	CONSTRAINT `skus_barcode_unique` UNIQUE(`barcode`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32),
	`name` varchar(255) NOT NULL,
	`phone` varchar(32),
	`note` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`),
	CONSTRAINT `suppliers_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `warehouses_id` PRIMARY KEY(`id`),
	CONSTRAINT `warehouses_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `consignment_returns` ADD `deleted_by` varchar(36);
--> statement-breakpoint
ALTER TABLE `consignments` ADD `deleted_by` varchar(36);
--> statement-breakpoint
ALTER TABLE `damage_records` ADD `deleted_by` varchar(36);
--> statement-breakpoint
ALTER TABLE `expenses` ADD `deleted_by` varchar(36);
--> statement-breakpoint
ALTER TABLE `items` ADD `deleted_by` varchar(36);
--> statement-breakpoint
ALTER TABLE `payments` ADD `deleted_by` varchar(36);
--> statement-breakpoint
ALTER TABLE `sellers` ADD `deleted_by` varchar(36);
--> statement-breakpoint
ALTER TABLE `staff` ADD `deleted_by` varchar(36);
--> statement-breakpoint
ALTER TABLE `workshop_todos` ADD `deleted_by` varchar(36);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `entity_type` varchar(64) DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `entity_id` varchar(64);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `before_json` json;
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `after_json` json;
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `user_agent` varchar(255);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `metadata` json;
--> statement-breakpoint
UPDATE `audit_logs` SET `entity_type` = `entity` WHERE `entity_type` = '';
