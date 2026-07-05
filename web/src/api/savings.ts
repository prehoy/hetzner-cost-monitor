import { queryOptions } from "@tanstack/react-query";
import { getJSON } from "./http";

export interface WasteFinding {
  id: number;
  category: string;
  name: string;
  location: string | null;
  projectId: number;
  projectName: string;
  monthlyCost: number;
  reason: string;
  fix: string;
}

export interface WasteList {
  currency: string;
  total: number;
  findings: WasteFinding[];
}

// GET /api/waste/list — advisory reclaimable-spend findings, sorted by cost desc.
export const savingsOpts = () =>
  queryOptions({
    queryKey: ["waste", "list"],
    queryFn: () => getJSON<WasteList>("/api/waste/list"),
  });
