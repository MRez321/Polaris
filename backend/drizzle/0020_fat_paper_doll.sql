CREATE TABLE `purchase_receipt_items` (
	`id` varchar(36) NOT NULL,
	`receipt_id` varchar(36) NOT NULL,
	`purchase_item_id` varchar(36) NOT NULL,
	`sku_id` varchar(36) NOT NULL,
	`quantity` int NOT NULL,
	`unit_cost` bigint,
	CONSTRAINT `purchase_receipt_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_receipts` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32),
	`purchase_id` varchar(36) NOT NULL,
	`supplier_id` varchar(36) NOT NULL,
	`warehouse_id` varchar(36),
	`location_id` varchar(36),
	`received_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`received_by` varchar(36),
	`status` varchar(32) NOT NULL DEFAULT 'posted',
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_receipts_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `purchase_request_items` (
	`id` varchar(36) NOT NULL,
	`request_id` varchar(36) NOT NULL,
	`sku_id` varchar(36) NOT NULL,
	`quantity` int NOT NULL,
	`unit` varchar(32),
	`notes` text,
	CONSTRAINT `purchase_request_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_requests` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32),
	`requested_by` varchar(36),
	`request_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`supplier_id` varchar(36),
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_requests_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `supplier_prices` (
	`id` varchar(36) NOT NULL,
	`supplier_id` varchar(36) NOT NULL,
	`sku_id` varchar(36) NOT NULL,
	`unit` varchar(32),
	`purchase_price` bigint NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'IRT',
	`effective_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`expires_at` datetime,
	`min_quantity` int,
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supply_cost_allocations` (
	`id` varchar(36) NOT NULL,
	`cost_id` varchar(36) NOT NULL,
	`purchase_item_id` varchar(36) NOT NULL,
	`amount` bigint NOT NULL,
	CONSTRAINT `supply_cost_allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supply_costs` (
	`id` varchar(36) NOT NULL,
	`purchase_id` varchar(36) NOT NULL,
	`cost_type` varchar(32) NOT NULL DEFAULT 'other',
	`description` varchar(512),
	`amount` bigint NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'IRT',
	`cost_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`party_type` varchar(32),
	`party_id` varchar(36),
	`allocation_method` varchar(32) NOT NULL DEFAULT 'by_value',
	`notes` text,
	`created_by` varchar(36),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `supply_costs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `purchase_items` ADD `unit` varchar(32);--> statement-breakpoint
ALTER TABLE `purchases` ADD `request_id` varchar(36);--> statement-breakpoint
ALTER TABLE `purchases` ADD `order_date` datetime;--> statement-breakpoint
ALTER TABLE `purchases` ADD `expected_date` datetime;--> statement-breakpoint
ALTER TABLE `purchases` ADD `subtotal` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `purchases` ADD `additional_costs` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `purchases` ADD `payment_terms` varchar(255);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `contact_person` varchar(255);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `email` varchar(255);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `address` varchar(512);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `is_active` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `cooperation_terms` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `payment_terms` varchar(255);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `payment_due_days` int;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `min_order_amount` bigint;--> statement-breakpoint
CREATE INDEX `purchase_receipt_items_receipt_id_idx` ON `purchase_receipt_items` (`receipt_id`);--> statement-breakpoint
CREATE INDEX `purchase_receipt_items_purchase_item_id_idx` ON `purchase_receipt_items` (`purchase_item_id`);--> statement-breakpoint
CREATE INDEX `purchase_receipt_items_sku_id_idx` ON `purchase_receipt_items` (`sku_id`);--> statement-breakpoint
CREATE INDEX `purchase_receipts_purchase_id_idx` ON `purchase_receipts` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `purchase_receipts_supplier_id_idx` ON `purchase_receipts` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `purchase_receipts_date_idx` ON `purchase_receipts` (`received_date`);--> statement-breakpoint
CREATE INDEX `purchase_request_items_request_id_idx` ON `purchase_request_items` (`request_id`);--> statement-breakpoint
CREATE INDEX `purchase_request_items_sku_id_idx` ON `purchase_request_items` (`sku_id`);--> statement-breakpoint
CREATE INDEX `purchase_requests_status_idx` ON `purchase_requests` (`status`);--> statement-breakpoint
CREATE INDEX `purchase_requests_supplier_id_idx` ON `purchase_requests` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `supplier_prices_supplier_id_idx` ON `supplier_prices` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `supplier_prices_sku_id_idx` ON `supplier_prices` (`sku_id`);--> statement-breakpoint
CREATE INDEX `supplier_prices_effective_idx` ON `supplier_prices` (`supplier_id`,`sku_id`,`effective_date`);--> statement-breakpoint
CREATE INDEX `supply_cost_alloc_cost_id_idx` ON `supply_cost_allocations` (`cost_id`);--> statement-breakpoint
CREATE INDEX `supply_cost_alloc_item_id_idx` ON `supply_cost_allocations` (`purchase_item_id`);--> statement-breakpoint
CREATE INDEX `supply_costs_purchase_id_idx` ON `supply_costs` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `supply_costs_type_idx` ON `supply_costs` (`cost_type`);--> statement-breakpoint
CREATE INDEX `supply_costs_date_idx` ON `supply_costs` (`cost_date`);--> statement-breakpoint
CREATE INDEX `purchases_request_id_idx` ON `purchases` (`request_id`);--> statement-breakpoint
CREATE INDEX `suppliers_active_idx` ON `suppliers` (`is_active`);