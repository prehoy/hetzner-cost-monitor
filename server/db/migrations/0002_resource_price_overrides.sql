DROP TABLE `price_overrides`;
--> statement-breakpoint
CREATE TABLE `price_overrides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`hetzner_id` text NOT NULL,
	`hourly_cost` real NOT NULL,
	`monthly_cost` real NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_overrides_resource` ON `price_overrides` (`project_id`,`hetzner_id`);
