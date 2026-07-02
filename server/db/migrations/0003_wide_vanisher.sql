CREATE TABLE `backup_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`endpoint` text,
	`region` text,
	`bucket` text NOT NULL,
	`prefix` text DEFAULT 'hacm' NOT NULL,
	`access_key_id` text NOT NULL,
	`secret_encrypted` text NOT NULL,
	`secret_iv` text NOT NULL,
	`interval_hours` integer DEFAULT 24 NOT NULL,
	`retention` integer DEFAULT 14 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_backup_at` integer,
	`last_backup_error` text,
	`last_backup_key` text,
	`updated_at` integer NOT NULL
);
