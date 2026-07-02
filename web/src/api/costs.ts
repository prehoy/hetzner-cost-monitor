import {
  costsBreakdownOptions,
  costsSummaryOptions,
  costsTimeseriesOptions,
} from "./generated/@tanstack/react-query.gen";

// Query params are documented in prose (not OpenAPI validators), so the generated
// types mark query `never`. The fetch client still serializes runtime `query`;
// cast to pass it through.
export const summaryOpts = (q?: { projectId?: string }) =>
  costsSummaryOptions((q?.projectId ? { query: q } : undefined) as any);

export const timeseriesOpts = (q: {
  groupBy: string;
  from: string;
  to: string;
  projectId?: string;
}) => costsTimeseriesOptions({ query: q } as any);

export const breakdownOpts = (q?: { projectId?: string }) =>
  costsBreakdownOptions((q ? { query: q } : undefined) as any);
