// Money formatting. Backend values are NET; callers pass a vatMultiplier
// (1 for net, 1 + vatRate/100 for gross) so the whole UI toggles consistently.
export function money(net: number, currency = "EUR", dp = 2, vatMultiplier = 1) {
  const v = (net ?? 0) * vatMultiplier;
  const sym = currency === "EUR" ? "€" : currency + " ";
  return sym + v.toFixed(dp);
}

// Compact per-hour figure (needs more precision — hourly rates are tiny).
export const perHour = (net: number, currency: string, m = 1) => money(net, currency, 4, m);
export const perMonth = (net: number, currency: string, m = 1) => money(net, currency, 2, m);

export function vatMultiplier(gross: boolean, vatRate: number) {
  return gross ? 1 + (vatRate ?? 0) / 100 : 1;
}
