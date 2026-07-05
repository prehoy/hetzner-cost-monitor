import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = () => new Date();

// Single admin. Registration is blocked once one row exists.
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
});

// One Hetzner project = one API token (encrypted at rest).
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  tokenEncrypted: text("token_encrypted").notNull(),
  tokenIv: text("token_iv").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  lastPollAt: integer("last_poll_at", { mode: "timestamp_ms" }),
  lastPollError: text("last_poll_error"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
});

// Live inventory, upserted every poll. deletedAt set (soft-delete) when a
// resource stops appearing. Costs are NET (ex-VAT); apply vatRate in the UI.
export const resources = sqliteTable(
  "resources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").notNull(),
    hetznerId: text("hetzner_id").notNull(),
    category: text("category").notNull(), // server|volume|load_balancer|primary_ip|floating_ip|snapshot|backup|traffic
    name: text("name"),
    hetznerType: text("hetzner_type"), // e.g. cx22, lb11, ipv4
    location: text("location"),
    specJson: text("spec_json"),
    hourlyCost: real("hourly_cost").notNull().default(0),
    monthlyCost: real("monthly_cost").notNull().default(0),
    firstSeen: integer("first_seen", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
    lastSeen: integer("last_seen", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (t) => [uniqueIndex("resources_project_hetzner").on(t.projectId, t.hetznerId, t.category)],
);

// Billing ledger: one row per (resource, clock-hour) it was observed in.
// Hetzner bills a full hour the instant a server exists, so we record the hour
// bucket on sight — a burst node up for 2 seconds still bills its whole hour.
// This is the source of truth for accrued/historical spend and the charts.
export const billingHours = sqliteTable(
  "billing_hours",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    hourStart: integer("hour_start", { mode: "timestamp_ms" }).notNull(),
    projectId: integer("project_id").notNull(),
    hetznerId: text("hetzner_id").notNull(),
    category: text("category").notNull(),
    location: text("location"),
    // Cost billed for this one hour = the resource's hourly rate (NET).
    hourlyCost: real("hourly_cost").notNull(),
  },
  (t) => [
    uniqueIndex("billing_hours_unique").on(t.hourStart, t.projectId, t.hetznerId, t.category),
  ],
);

// Manual PER-RESOURCE price overrides. Hetzner's /v1/pricing only exposes
// CURRENT list prices, but grandfathering is per-instance (a server keeps the
// price it was created at), so overrides are keyed to a specific resource, not
// a type. Pins the real NET price for one server.
export const priceOverrides = sqliteTable(
  "price_overrides",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").notNull(),
    hetznerId: text("hetzner_id").notNull(),
    hourlyCost: real("hourly_cost").notNull(),
    monthlyCost: real("monthly_cost").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("price_overrides_resource").on(t.projectId, t.hetznerId)],
);

// S3 backup config (single row). Secret access key encrypted at rest with
// APP_SECRET, like Hetzner tokens. Works with any S3-compatible provider.
export const backupConfig = sqliteTable("backup_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  endpoint: text("endpoint"), // empty for AWS; set for MinIO/Hetzner/R2/B2
  region: text("region"),
  bucket: text("bucket").notNull(),
  prefix: text("prefix").notNull().default("hacm"),
  accessKeyId: text("access_key_id").notNull(),
  secretEncrypted: text("secret_encrypted").notNull(),
  secretIv: text("secret_iv").notNull(),
  intervalHours: integer("interval_hours").notNull().default(24),
  retention: integer("retention").notNull().default(14), // keep newest N backups
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  lastBackupAt: integer("last_backup_at", { mode: "timestamp_ms" }),
  lastBackupError: text("last_backup_error"),
  lastBackupKey: text("last_backup_key"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
});

export const pricingSnapshots = sqliteTable("pricing_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
  currency: text("currency"),
  vatRate: text("vat_rate"),
  dataJson: text("data_json").notNull(),
});

// Spend alert — a single global rule (OSS-limited). Evaluated on an interval; when
// projected monthly burn crosses the threshold we POST once to the webhook,
// debounced by `triggered` (re-arms when burn drops back below). HCM Cloud adds
// per-project + multi-metric alerts and email delivery.
export const alertConfig = sqliteTable("alert_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  webhookUrl: text("webhook_url").notNull(),
  threshold: real("threshold").notNull(), // NET €/mo projected
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  triggered: integer("triggered", { mode: "boolean" }).notNull().default(false), // currently in breach
  lastValue: real("last_value"), // projected burn at last evaluation
  lastNotifiedAt: integer("last_notified_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(now),
});

export const schema = {
  users,
  sessions,
  projects,
  resources,
  billingHours,
  priceOverrides,
  backupConfig,
  pricingSnapshots,
  alertConfig,
};
