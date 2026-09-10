-- Workshop todos (dashboard task-list widget) + backup settings blob row.
-- Hand-scoped: drizzle generated this file against the stale 0012 snapshot
-- (0013/0014 were hand-written without snapshot files), so its auto diff
-- re-created workshop_notifications and re-added existing consignments
-- columns. Only the two genuinely new statements are kept here.
CREATE TABLE `workshop_todos` (
	`id` varchar(36) NOT NULL,
	`text` varchar(512) NOT NULL,
	`done` boolean NOT NULL DEFAULT false,
	`priority` varchar(16) NOT NULL DEFAULT 'medium',
	`due_date` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`done_at` datetime,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `workshop_todos_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE INDEX `workshop_todos_is_deleted_idx` ON `workshop_todos` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `workshop_todos_created_at_idx` ON `workshop_todos` (`created_at`);--> statement-breakpoint
CREATE TABLE `backup_settings` (
	`id` varchar(36) NOT NULL,
	`data` json NOT NULL,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `backup_settings_id` PRIMARY KEY(`id`)
);
