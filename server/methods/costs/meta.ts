import { desc } from "drizzle-orm";
import db from "../../db/client";
import { pricingSnapshots } from "../../db/schema";

// Latest currency + VAT rate from the most recent pricing fetch. UI applies VAT.
export async function pricingMeta() {
  const latest = await db.query.pricingSnapshots.findFirst({
    orderBy: desc(pricingSnapshots.fetchedAt),
    columns: { currency: true, vatRate: true },
  });
  return {
    currency: latest?.currency ?? "EUR",
    vatRate: latest?.vatRate ? parseFloat(latest.vatRate) : 0,
  };
}
