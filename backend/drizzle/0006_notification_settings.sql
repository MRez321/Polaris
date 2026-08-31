-- Notification settings: single JSON-blob row holding the Telegram /
-- Melipayamak outbound-notification switches. Secrets stay in .env.
CREATE TABLE IF NOT EXISTS `notification_settings` (
  `id` varchar(36) NOT NULL,
  `data` json NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci;
