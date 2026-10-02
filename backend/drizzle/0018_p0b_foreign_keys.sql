-- P0-B 0018: foreign keys within the new model + actor references to users.
-- See docs/superpowers/specs/2026-09-14-p0b-architecture-design.md
-- DO NOT EDIT: hand-written per migration strategy (one logical change per file).

ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `skus` ADD CONSTRAINT `skus_product_variant_id_fk` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `locations` ADD CONSTRAINT `locations_warehouse_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `inventory_ledger` ADD CONSTRAINT `inventory_ledger_sku_id_fk` FOREIGN KEY (`sku_id`) REFERENCES `skus`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `inventory_ledger` ADD CONSTRAINT `inventory_ledger_location_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `sku_locations` ADD CONSTRAINT `sku_locations_sku_id_fk` FOREIGN KEY (`sku_id`) REFERENCES `skus`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `sku_locations` ADD CONSTRAINT `sku_locations_location_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_purchase_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_sku_id_fk` FOREIGN KEY (`sku_id`) REFERENCES `skus`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_supplier_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `sales_order_lines` ADD CONSTRAINT `sales_order_lines_order_id_fk` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_channel_id_fk` FOREIGN KEY (`channel_id`) REFERENCES `sales_channels`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `sales_payments` ADD CONSTRAINT `sales_payments_order_id_fk` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_purchase_id_purchases_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE restrict ON UPDATE cascade;
