CREATE TABLE `alert_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`webhook_url` text NOT NULL,
	`threshold` real NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`triggered` integer DEFAULT false NOT NULL,
	`last_value` real,
	`last_notified_at` integer,
	`updated_at` integer NOT NULL
);
