-- P0-B 0019 secondary indexes for the new model: see docs/superpowers/specs/2026-09-14-p0b-architecture-design.md
-- DO NOT EDIT: generated from schema, hand-split per migration strategy

CREATE INDEX `customers_deleted_at_idx` ON `customers` (`deleted_at`);
--> statement-breakpoint
CREATE INDEX `financial_txn_type_idx` ON `financial_transactions` (`txn_type`);
--> statement-breakpoint
CREATE INDEX `financial_counterparty_idx` ON `financial_transactions` (`counterparty_type`,`counterparty_id`);
--> statement-breakpoint
CREATE INDEX `financial_reference_idx` ON `financial_transactions` (`reference_type`,`reference_id`);
--> statement-breakpoint
CREATE INDEX `inventory_ledger_sku_location_idx` ON `inventory_ledger` (`sku_id`,`location_id`);
--> statement-breakpoint
CREATE INDEX `inventory_ledger_reference_idx` ON `inventory_ledger` (`reference_type`,`reference_id`);
--> statement-breakpoint
CREATE INDEX `inventory_ledger_created_at_idx` ON `inventory_ledger` (`created_at`);
--> statement-breakpoint
CREATE INDEX `locations_warehouse_id_idx` ON `locations` (`warehouse_id`);
--> statement-breakpoint
CREATE INDEX `product_variants_product_id_idx` ON `product_variants` (`product_id`);
--> statement-breakpoint
CREATE INDEX `products_category_id_idx` ON `products` (`category_id`);
--> statement-breakpoint
CREATE INDEX `products_deleted_at_idx` ON `products` (`deleted_at`);
--> statement-breakpoint
CREATE INDEX `purchase_items_purchase_id_idx` ON `purchase_items` (`purchase_id`);
--> statement-breakpoint
CREATE INDEX `purchase_items_sku_id_idx` ON `purchase_items` (`sku_id`);
--> statement-breakpoint
CREATE INDEX `purchases_supplier_id_idx` ON `purchases` (`supplier_id`);
--> statement-breakpoint
CREATE INDEX `purchases_status_idx` ON `purchases` (`status`);
--> statement-breakpoint
CREATE INDEX `sales_order_lines_order_id_idx` ON `sales_order_lines` (`sales_order_id`);
--> statement-breakpoint
CREATE INDEX `sales_order_lines_sku_id_idx` ON `sales_order_lines` (`sku_id`);
--> statement-breakpoint
CREATE INDEX `sales_orders_channel_id_idx` ON `sales_orders` (`channel_id`);
--> statement-breakpoint
CREATE INDEX `sales_orders_status_idx` ON `sales_orders` (`status`);
--> statement-breakpoint
CREATE INDEX `sales_payments_order_id_idx` ON `sales_payments` (`sales_order_id`);
--> statement-breakpoint
CREATE INDEX `settlements_counterparty_idx` ON `settlements` (`counterparty_type`,`counterparty_id`);
--> statement-breakpoint
CREATE INDEX `skus_product_variant_id_idx` ON `skus` (`product_variant_id`);
--> statement-breakpoint
CREATE INDEX `skus_legacy_item_id_idx` ON `skus` (`legacy_item_id`);
--> statement-breakpoint
CREATE INDEX `skus_deleted_at_idx` ON `skus` (`deleted_at`);
--> statement-breakpoint
CREATE INDEX `suppliers_deleted_at_idx` ON `suppliers` (`deleted_at`);
--> statement-breakpoint
CREATE INDEX `warehouses_deleted_at_idx` ON `warehouses` (`deleted_at`);
--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);
