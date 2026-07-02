import { and, eq, isNull, lt } from "drizzle-orm";
import db from "../../db/client";
import { billingHours, priceOverrides, pricingSnapshots, projects, resources } from "../../db/schema";
import { tEnv } from "../../env";
import { decrypt } from "../crypto";
import { hetznerGet, hetznerList } from "../hetzner/client";
import logger from "../logger";
import processError from "../processError";
import {
  priceFloatingIp,
  priceLoadBalancer,
  pricePrimaryIp,
  priceServer,
  priceSnapshot,
  priceVolume,
  type Priced,
  type Pricing,
} from "./pricing";

// Global rate card cache — pricing is account-agnostic and rarely changes, so
// one fetch per PRICING_TTL_MS (default 1h) serves every project.
let pricingCache: { at: number; pricing: Pricing } | null = null;

async function getPricing(token: string): Promise<Pricing> {
  if (pricingCache && Date.now() - pricingCache.at < tEnv.PRICING_TTL_MS) {
    return pricingCache.pricing;
  }
  const { pricing } = await hetznerGet<{ pricing: Pricing }>(token, "/pricing");
  pricingCache = { at: Date.now(), pricing };
  await db.insert(pricingSnapshots).values({
    currency: pricing.currency,
    vatRate: pricing.vat_rate,
    dataJson: JSON.stringify(pricing),
  });
  return pricing;
}

async function collectProject(project: typeof projects.$inferSelect): Promise<void> {
  const token = decrypt(project.tokenEncrypted, project.tokenIv);
  const pricing = await getPricing(token);

  const [servers, volumes, lbs, primaryIps, floatingIps, snapshots] = await Promise.all([
    hetznerList(token, "/servers", "servers"),
    hetznerList(token, "/volumes", "volumes"),
    hetznerList(token, "/load_balancers", "load_balancers"),
    hetznerList(token, "/primary_ips", "primary_ips"),
    hetznerList(token, "/floating_ips", "floating_ips"),
    hetznerList(token, "/images?type=snapshot", "images"),
  ]);

  const ovRows = await db.query.priceOverrides.findMany({
    where: eq(priceOverrides.projectId, project.id),
  });
  const overrides = new Map(
    ovRows.map((o) => [o.hetznerId, { hourlyCost: o.hourlyCost, monthlyCost: o.monthlyCost }]),
  );

  const priced: Priced[] = [
    ...servers.flatMap((s) => priceServer(pricing, s, overrides.get(String(s.id)))),
    ...volumes.map((v) => priceVolume(pricing, v)),
    ...lbs.map((l) => priceLoadBalancer(pricing, l)),
    ...primaryIps.map((p) => pricePrimaryIp(pricing, p)),
    ...floatingIps.map((f) => priceFloatingIp(pricing, f)),
    ...snapshots.map((i) => priceSnapshot(pricing, i)),
  ];

  const seenAt = new Date();
  for (const r of priced) {
    await db
      .insert(resources)
      .values({
        projectId: project.id,
        hetznerId: r.hetznerId,
        category: r.category,
        name: r.name,
        hetznerType: r.hetznerType,
        location: r.location,
        specJson: JSON.stringify(r.spec),
        hourlyCost: r.hourlyCost,
        monthlyCost: r.monthlyCost,
        lastSeen: seenAt,
        deletedAt: null,
      })
      .onConflictDoUpdate({
        target: [resources.projectId, resources.hetznerId, resources.category],
        set: {
          name: r.name,
          hetznerType: r.hetznerType,
          location: r.location,
          specJson: JSON.stringify(r.spec),
          hourlyCost: r.hourlyCost,
          monthlyCost: r.monthlyCost,
          lastSeen: seenAt,
          deletedAt: null,
        },
      });
  }

  // Record the billing-hour bucket for every live resource. onConflictDoNothing:
  // the first sighting in an hour books that whole hour; later polls in the same
  // hour are no-ops. A server that vanishes seconds later keeps its billed hour.
  const hourStart = new Date(Math.floor(seenAt.getTime() / 3_600_000) * 3_600_000);
  if (priced.length) {
    await db
      .insert(billingHours)
      .values(
        priced.map((r) => ({
          hourStart,
          projectId: project.id,
          hetznerId: r.hetznerId,
          category: r.category,
          location: r.location,
          hourlyCost: r.hourlyCost,
        })),
      )
      .onConflictDoNothing();
  }

  // Soft-delete anything not seen this cycle (drops it from live burn; its
  // already-booked billing hours remain in the ledger).
  await db
    .update(resources)
    .set({ deletedAt: seenAt })
    .where(
      and(
        eq(resources.projectId, project.id),
        isNull(resources.deletedAt),
        lt(resources.lastSeen, seenAt),
      ),
    );

  await db
    .update(projects)
    .set({ lastPollAt: seenAt, lastPollError: null })
    .where(eq(projects.id, project.id));
}

// One poll cycle across all active projects. Per-project failures are recorded
// and isolated — a bad token never stops the others or crashes the loop.
export default async function poll(): Promise<void> {
  const active = await db.query.projects.findMany({ where: eq(projects.active, true) });
  for (const project of active) {
    try {
      await collectProject(project);
    } catch (e) {
      logger.error({ message: `Poll failed for project ${project.id}`, error: processError(e) });
      await db
        .update(projects)
        .set({ lastPollAt: new Date(), lastPollError: processError(e).error_message })
        .where(eq(projects.id, project.id));
    }
  }
}
