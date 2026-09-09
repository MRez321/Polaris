-- Scheduled delivery: consignments whose goods are handed over on a later
-- date. Existing rows were physically delivered at creation time (stock was
-- deducted and debt applied immediately), so they backfill as 'delivered'.
-- New scheduled rows get delivery_status='pending': stock is RESERVED at
-- creation (keeps the FOR-UPDATE oversell guard + stock-split invariant),
-- but seller debt and the due-date countdown only start on delivery.
ALTER TABLE `consignments` ADD COLUMN `delivery_status` varchar(32) NOT NULL DEFAULT 'delivered' AFTER `due_date`;--> statement-breakpoint
ALTER TABLE `consignments` ADD COLUMN `delivered_at` datetime AFTER `delivery_status`;--> statement-breakpoint
-- Handover date of existing rows = the delivery moment (they were delivered
-- on creation), so the column starts truthful instead of null for them.
UPDATE `consignments` SET `delivered_at` = `created_at` WHERE `delivered_at` IS NULL;--> statement-breakpoint
-- In-app workshop notification feed for the header bell panel: event rows
-- (critical/need_action/notification/system) + derived read-markers
-- (entity_type='derived_marker', e.g. entityId "overdue:HND-0007").
CREATE TABLE IF NOT EXISTS `workshop_notifications` (
  `id` varchar(36) NOT NULL,
  `type` varchar(32),
  `title` varchar(255),
  `body` text,
  `entity_type` varchar(64) NOT NULL,
  `entity_id` varchar(128) NOT NULL,
  `link` varchar(255),
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` datetime,
  PRIMARY KEY (`id`),
  KEY `workshop_notifications_created_at_idx` (`created_at`),
  KEY `workshop_notifications_entity_idx` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;
