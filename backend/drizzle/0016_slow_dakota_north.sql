-- P0-A-06: better-auth twoFactor plugin (TOTP + backup codes).
-- Idempotency contract: the two_factor table / user.two_factor_enabled
-- column may ALREADY exist on deployments that ran a since-reverted
-- experiment (shape verified identical to better-auth's schema). MySQL 8 has
-- no "ADD COLUMN IF NOT EXISTS" and drizzle's migrator re-runs any file whose
-- hash is not recorded, so this file contains only statements that are safe
-- no-ops on already-patched databases. The conditional user-column add runs
-- as a guarded pre-step from src/core/db/runMigrations.ts and scripts/migrate.js
-- before this file is applied.
CREATE TABLE IF NOT EXISTS `two_factor` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`secret` varchar(512) NOT NULL,
	`backup_codes` varchar(1024) NOT NULL,
	`verified` boolean NOT NULL DEFAULT true,
	`failed_verification_count` int NOT NULL DEFAULT 0,
	`locked_until` datetime,
	CONSTRAINT `two_factor_id` PRIMARY KEY(`id`),
	INDEX `two_factor_user_id_idx` (`user_id`)
);
