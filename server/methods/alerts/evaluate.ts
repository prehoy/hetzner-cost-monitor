import { eq, isNull, sql } from "drizzle-orm";
import db from "../../db/client";
import { alertConfig, resources } from "../../db/schema";
import { pricingMeta } from "../costs/meta";
import logger from "../logger";
import processError from "../processError";

// Evaluate the single spend rule: current projected monthly burn (live inventory,
// NET) vs the threshold. Fire the webhook once on the upward crossing; re-arm when
// burn drops back below (debounced by `triggered`).
export async function evaluateAlert(): Promise<void> {
  const cfg = await db.query.alertConfig.findFirst();
  if (!cfg || !cfg.enabled || !cfg.webhookUrl) return;

  const [row] = await db
    .select({ monthly: sql<number>`coalesce(sum(${resources.monthlyCost}), 0)` })
    .from(resources)
    .where(isNull(resources.deletedAt));
  const projected = row?.monthly ?? 0;

  const breach = projected > cfg.threshold;
  const patch: Partial<typeof alertConfig.$inferInsert> = {
    lastValue: projected,
    updatedAt: new Date(),
  };

  if (breach && !cfg.triggered) {
    await fireWebhook(cfg.webhookUrl, projected, cfg.threshold);
    patch.triggered = true;
    patch.lastNotifiedAt = new Date();
  } else if (!breach && cfg.triggered) {
    patch.triggered = false; // dropped back under — re-arm for the next crossing
  }
  await db.update(alertConfig).set(patch).where(eq(alertConfig.id, cfg.id));
}

// POST a generic JSON payload — works with Slack/Discord/Mattermost incoming
// webhooks (they render `text`) and any custom endpoint. Failures are logged, not
// thrown, so a bad webhook never wedges the loop.
async function fireWebhook(url: string, value: number, threshold: number): Promise<void> {
  const { currency } = await pricingMeta();
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "spend_alert",
        text: `Hetzner spend alert: projected monthly ${currency}${value.toFixed(2)} crossed your ${currency}${threshold.toFixed(2)} threshold.`,
        projectedMonthly: value,
        threshold,
        currency,
        at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    logger.error({ message: "Alert webhook failed", error: processError(e) });
  }
}
