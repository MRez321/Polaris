CREATE TABLE IF NOT EXISTS `account` (
	`id` varchar(36) NOT NULL,
	`account_id` varchar(255) NOT NULL,
	`provider_id` varchar(255) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` datetime,
	`refresh_token_expires_at` datetime,
	`scope` varchar(255),
	`password` varchar(255),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `audit_logs` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL DEFAULT '',
	`user_name` varchar(255) NOT NULL DEFAULT '',
	`user_role` varchar(32),
	`action` varchar(64) NOT NULL,
	`entity` varchar(32) NOT NULL,
	`details` text NOT NULL,
	`ip_address` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `categories` (
	`id` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `company_settings` (
	`id` varchar(36) NOT NULL,
	`data` json NOT NULL,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `company_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `consignment_returns` (
	`id` varchar(36) NOT NULL,
	`consignment_id` varchar(36) NOT NULL,
	`consignment_code` varchar(32) NOT NULL,
	`seller_id` varchar(36) NOT NULL,
	`seller_name` varchar(255) NOT NULL,
	`date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`items` json NOT NULL,
	`total_return_amount` bigint NOT NULL,
	`processed_by` varchar(255) NOT NULL DEFAULT '',
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `consignment_returns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `consignments` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`seller_id` varchar(36) NOT NULL,
	`seller_name` varchar(255) NOT NULL,
	`date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`due_date` datetime NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`items` json NOT NULL,
	`total_amount` bigint NOT NULL,
	`returned_amount` bigint NOT NULL DEFAULT 0,
	`net_amount` bigint NOT NULL,
	`paid_amount` bigint NOT NULL DEFAULT 0,
	`remaining_amount` bigint NOT NULL,
	`notes` text,
	`handed_over_by` varchar(255) NOT NULL DEFAULT '',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `consignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `consignments_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `expenses` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`title` varchar(255) NOT NULL,
	`category` varchar(64) NOT NULL,
	`amount` bigint NOT NULL,
	`date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`paid_by` varchar(128) NOT NULL DEFAULT 'صندوق کارگاه',
	`payment_method` varchar(32) NOT NULL DEFAULT 'cash',
	`receipt_image_url` varchar(512),
	`description` text,
	`is_recurring` boolean NOT NULL DEFAULT false,
	`cost_allocation` varchar(32) NOT NULL DEFAULT 'workshop_fund',
	`cost_shares` json NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`),
	CONSTRAINT `expenses_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `items` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(128) NOT NULL,
	`cost_price` bigint NOT NULL DEFAULT 0,
	`consignment_price` bigint NOT NULL DEFAULT 0,
	`retail_price` bigint NOT NULL DEFAULT 0,
	`stock_quantity` int NOT NULL DEFAULT 0,
	`min_stock_threshold` int NOT NULL DEFAULT 5,
	`sizes` json NOT NULL,
	`colors` json NOT NULL,
	`fabric` varchar(255) NOT NULL DEFAULT '',
	`image_url` varchar(512),
	`images` json NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `items_id` PRIMARY KEY(`id`),
	CONSTRAINT `items_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `owners` (
	`id` varchar(36) NOT NULL,
	`data` json NOT NULL,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `owners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `payments` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`seller_id` varchar(36) NOT NULL,
	`seller_name` varchar(255) NOT NULL,
	`amount` bigint NOT NULL,
	`date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`payment_method` varchar(32) NOT NULL,
	`tracking_number` varchar(128),
	`allocations` json NOT NULL,
	`unallocated_amount` bigint NOT NULL DEFAULT 0,
	`recorded_by` varchar(255) NOT NULL DEFAULT '',
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `profit_distributions` (
	`id` varchar(36) NOT NULL,
	`period_name` varchar(255) NOT NULL,
	`start_date` datetime NOT NULL,
	`end_date` datetime NOT NULL,
	`gross_revenue` bigint NOT NULL DEFAULT 0,
	`total_expenses` bigint NOT NULL DEFAULT 0,
	`reinvestment_reserve` bigint NOT NULL DEFAULT 0,
	`net_profit` bigint NOT NULL DEFAULT 0,
	`distribution_mode` varchar(16) NOT NULL DEFAULT 'units',
	`total_share_units` int NOT NULL DEFAULT 0,
	`recipients` json NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`calculated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `profit_distributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sellers` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`additional_phones` json NOT NULL,
	`national_code` varchar(32) NOT NULL DEFAULT '',
	`street_location` varchar(512) NOT NULL DEFAULT '',
	`has_guarantee` boolean NOT NULL DEFAULT false,
	`guarantee_type` varchar(32) NOT NULL DEFAULT 'promissory_note',
	`guarantee_amount` bigint NOT NULL DEFAULT 0,
	`guarantee_details` varchar(255) NOT NULL DEFAULT '',
	`credit_limit` bigint NOT NULL DEFAULT 0,
	`bank_accounts` json NOT NULL,
	`current_debt` bigint NOT NULL DEFAULT 0,
	`total_handovers_value` bigint NOT NULL DEFAULT 0,
	`total_paid` bigint NOT NULL DEFAULT 0,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`avatar_url` varchar(512),
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `sellers_id` PRIMARY KEY(`id`),
	CONSTRAINT `sellers_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `session` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` datetime NOT NULL,
	`ip_address` varchar(64),
	`user_agent` varchar(512),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`(191))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `staff` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(64) NOT NULL,
	`role_title` varchar(255) NOT NULL DEFAULT '',
	`phones` json NOT NULL,
	`national_code` varchar(32),
	`hire_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`salary_type` varchar(32) NOT NULL DEFAULT 'monthly',
	`salary_amount` bigint NOT NULL DEFAULT 0,
	`bank_accounts` json NOT NULL,
	`avatar_url` varchar(512),
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`notes` text,
	`resume_url` varchar(512),
	`resume_attachment_name` varchar(255),
	`resume_attachment_data` longtext,
	`tasks_completed_count` int NOT NULL DEFAULT 0,
	`activity_history` json NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `staff_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` varchar(512),
	`role` varchar(32),
	`banned` boolean NOT NULL DEFAULT false,
	`ban_reason` varchar(255),
	`ban_expires` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`(191))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `verification` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `returns_consignment_id_idx` ON `consignment_returns` (`consignment_id`);--> statement-breakpoint
CREATE INDEX `returns_seller_id_idx` ON `consignment_returns` (`seller_id`);--> statement-breakpoint
CREATE INDEX `consignments_seller_id_idx` ON `consignments` (`seller_id`);--> statement-breakpoint
CREATE INDEX `consignments_status_idx` ON `consignments` (`status`);--> statement-breakpoint
CREATE INDEX `consignments_is_deleted_idx` ON `consignments` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `expenses_is_deleted_idx` ON `expenses` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `items_category_idx` ON `items` (`category`);--> statement-breakpoint
CREATE INDEX `items_is_deleted_idx` ON `items` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `payments_seller_id_idx` ON `payments` (`seller_id`);--> statement-breakpoint
CREATE INDEX `payments_date_idx` ON `payments` (`date`);--> statement-breakpoint
CREATE INDEX `sellers_is_deleted_idx` ON `sellers` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `staff_is_deleted_idx` ON `staff` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`(191));