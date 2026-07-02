CREATE TABLE `price_overrides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`server_type` text NOT NULL,
	`hourly_cost` real NOT NULL,
	`monthly_cost` real NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_overrides_server_type_unique` ON `price_overrides` (`server_type`);