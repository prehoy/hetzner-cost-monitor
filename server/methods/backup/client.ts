import { S3Client } from "bun";
import { decrypt } from "../crypto";
import type { backupConfig } from "../../db/schema";

type Cfg = typeof backupConfig.$inferSelect;

// Build a Bun S3 client from stored config. Works with any S3-compatible
// provider (AWS, MinIO, Hetzner Object Storage, Cloudflare R2, Backblaze B2).
export function s3From(cfg: Cfg, plaintextSecret?: string) {
  return new S3Client({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: plaintextSecret ?? decrypt(cfg.secretEncrypted, cfg.secretIv),
    bucket: cfg.bucket,
    region: cfg.region || "auto",
    endpoint: cfg.endpoint || undefined,
  });
}
