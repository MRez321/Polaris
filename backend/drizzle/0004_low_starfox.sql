CREATE TABLE `blog_posts` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`title` varchar(512) NOT NULL,
	`excerpt` text NOT NULL,
	`image` varchar(512) NOT NULL DEFAULT '',
	`image_alt` varchar(255) NOT NULL DEFAULT '',
	`date` varchar(32) NOT NULL DEFAULT '',
	`read_time` varchar(32) NOT NULL DEFAULT '',
	`tags` json NOT NULL,
	`body` json NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'draft',
	`author_id` varchar(36) NOT NULL DEFAULT '',
	`author_name` varchar(255) NOT NULL DEFAULT '',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `blog_posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_posts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`customer_name` varchar(255) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`city` varchar(128) NOT NULL DEFAULT '',
	`address` text NOT NULL,
	`note` text,
	`payment_method` varchar(32) NOT NULL DEFAULT 'cod',
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`total` bigint NOT NULL DEFAULT 0,
	`items` json NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE INDEX `blog_posts_status_idx` ON `blog_posts` (`status`);--> statement-breakpoint
CREATE INDEX `orders_user_id_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_created_at_idx` ON `orders` (`created_at`);