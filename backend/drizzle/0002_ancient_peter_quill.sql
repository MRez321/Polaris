CREATE TABLE `gallery_images` (
	`id` varchar(36) NOT NULL,
	`url` varchar(512) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`category` varchar(32) NOT NULL DEFAULT 'general',
	`label` varchar(255) NOT NULL DEFAULT '',
	`tags` json NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `gallery_images_id` PRIMARY KEY(`id`)
);
