import { costsBreakdownOptions, costsTimeseriesOptions } from "./generated/@tanstack/react-query.gen";

// timeseries/breakdown take query params, but the backend documents them in
// prose (not as OpenAPI validators), so the generated types mark query `never`.
// The fetch client still serializes runtime `query`; cast to pass it through.
export const timeseriesOpts = (q: { groupBy: string; from: string; to: string }) =>
  costsTimeseriesOptions({ query: q } as any);

export const breakdownOpts = (q?: { projectId?: string }) =>
  costsBreakdownOptions((q ? { query: q } : undefined) as any);
