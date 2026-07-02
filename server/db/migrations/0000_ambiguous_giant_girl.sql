CREATE TABLE `billing_hours` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hour_start` integer NOT NULL,
	`project_id` integer NOT NULL,
	`hetzner_id` text NOT NULL,
	`category` text NOT NULL,
	`location` text,
	`hourly_cost` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_hours_unique` ON `billing_hours` (`hour_start`,`project_id`,`hetzner_id`,`category`);--> statement-breakpoint
CREATE TABLE `pricing_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fetched_at` integer NOT NULL,
	`currency` text,
	`vat_rate` text,
	`data_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`token_encrypted` text NOT NULL,
	`token_iv` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`last_poll_at` integer,
	`last_poll_error` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`hetzner_id` text NOT NULL,
	`category` text NOT NULL,
	`name` text,
	`hetzner_type` text,
	`location` text,
	`spec_json` text,
	`hourly_cost` real DEFAULT 0 NOT NULL,
	`monthly_cost` real DEFAULT 0 NOT NULL,
	`first_seen` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resources_project_hetzner` ON `resources` (`project_id`,`hetzner_id`,`category`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);