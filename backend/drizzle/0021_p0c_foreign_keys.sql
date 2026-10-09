-- P0-C 0021: foreign keys for the supply tables (supplier prices, requests,
-- receipts, supply costs) + the new purchases.request_id reference.
-- Hand-written per migration strategy (one logical change per file);
-- mirrors 0018_p0b_foreign_keys.sql conventions (restrict + cascade,
-- set null only for nullable convenience references).
-- NOTE: supplier_prices (supplier_id, sku_id) and purchases (supplier_id) FKs
-- were already created by 0020_fat_paper_doll — omitted here to avoid duplicates.

ALTER TABLE `purchase_requests` ADD CONSTRAINT `purchase_requests_supplier_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchase_request_items` ADD CONSTRAINT `purchase_request_items_request_id_fk` FOREIGN KEY (`request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchase_request_items` ADD CONSTRAINT `purchase_request_items_sku_id_fk` FOREIGN KEY (`sku_id`) REFERENCES `skus`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_request_id_fk` FOREIGN KEY (`request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchase_receipts` ADD CONSTRAINT `purchase_receipts_purchase_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchase_receipts` ADD CONSTRAINT `purchase_receipts_supplier_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchase_receipt_items` ADD CONSTRAINT `purchase_receipt_items_receipt_id_fk` FOREIGN KEY (`receipt_id`) REFERENCES `purchase_receipts`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchase_receipt_items` ADD CONSTRAINT `purchase_receipt_items_purchase_item_id_fk` FOREIGN KEY (`purchase_item_id`) REFERENCES `purchase_items`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchase_receipt_items` ADD CONSTRAINT `purchase_receipt_items_sku_id_fk` FOREIGN KEY (`sku_id`) REFERENCES `skus`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `supply_costs` ADD CONSTRAINT `supply_costs_purchase_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `supply_cost_allocations` ADD CONSTRAINT `supply_cost_alloc_cost_id_fk` FOREIGN KEY (`cost_id`) REFERENCES `supply_costs`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `supply_cost_allocations` ADD CONSTRAINT `supply_cost_alloc_item_id_fk` FOREIGN KEY (`purchase_item_id`) REFERENCES `purchase_items`(`id`) ON DELETE restrict ON UPDATE cascade;