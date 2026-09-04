-- Shop channel allocation: units of each item committed to the website
-- storefront. stock_quantity becomes the free warehouse pool, and
-- website_quantity is the online-shop pool; units with hand sellers stay
-- derived from consignment lines. Invariant:
--   total units = stock_quantity + website_quantity + seller-held units.
-- seed 0 = no items listed on the shop yet (existing data unaffected).
ALTER TABLE `items` ADD COLUMN `website_quantity` int NOT NULL DEFAULT 0 AFTER `min_stock_threshold`;--> statement-breakpoint
ALTER TABLE `items` ADD INDEX `items_website_quantity_idx` (`website_quantity`);
