import { and, desc, eq } from "drizzle-orm";
import db from "../../db/client";
import { priceOverrides, pricingSnapshots, resources } from "../../db/schema";

// Recompute one server's stored cost (override if set, else the list rate) and
// its backup row, so a price change is reflected immediately in live burn
// without waiting for the next poll.
export async function applyServerPricing(projectId: number, hetznerId: string) {
  const srv = await db.query.resources.findFirst({
    where: and(
      eq(resources.projectId, projectId),
      eq(resources.hetznerId, hetznerId),
      eq(resources.category, "server"),
    ),
  });
  if (!srv) return;

  const snap = await db.query.pricingSnapshots.findFirst({
    orderBy: desc(pricingSnapshots.fetchedAt),
  });
  const pricing = snap ? JSON.parse(snap.dataJson) : {};
  const pct = parseFloat(pricing.server_backup?.percentage ?? "20") / 100;

  const ov = await db.query.priceOverrides.findFirst({
    where: and(eq(priceOverrides.projectId, projectId), eq(priceOverrides.hetznerId, hetznerId)),
  });

  let hourly: number, monthly: number;
  if (ov) {
    hourly = ov.hourlyCost;
    monthly = ov.monthlyCost;
  } else {
    const st = pricing.server_types?.find((s: any) => s.name === srv.hetznerType);
    const lp = st?.prices?.find((p: any) => p.location === srv.location) ?? st?.prices?.[0];
    hourly = parseFloat(lp?.price_hourly?.net ?? "0");
    monthly = parseFloat(lp?.price_monthly?.net ?? "0");
  }

  await db
    .update(resources)
    .set({ hourlyCost: hourly, monthlyCost: monthly })
    .where(
      and(
        eq(resources.projectId, projectId),
        eq(resources.hetznerId, hetznerId),
        eq(resources.category, "server"),
      ),
    );
  // Backup row (if backups are on) tracks the server price.
  await db
    .update(resources)
    .set({ hourlyCost: hourly * pct, monthlyCost: monthly * pct })
    .where(
      and(
        eq(resources.projectId, projectId),
        eq(resources.hetznerId, `backup-${hetznerId}`),
        eq(resources.category, "backup"),
      ),
    );
}
