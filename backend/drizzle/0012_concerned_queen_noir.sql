ALTER TABLE `gallery_images` ADD `alt` varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `gallery_images` ADD `width` int;--> statement-breakpoint
ALTER TABLE `gallery_images` ADD `height` int;--> statement-breakpoint
ALTER TABLE `gallery_images` ADD `file_size` int;--> statement-breakpoint
ALTER TABLE `gallery_images` ADD `mime_type` varchar(32);