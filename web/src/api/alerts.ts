import { queryOptions } from "@tanstack/react-query";
import { getJSON, postJSON } from "./http";

export interface AlertConfig {
  id: number;
  webhookUrl: string;
  threshold: number;
  enabled: boolean;
  triggered: boolean;
  lastValue: number | null;
  lastNotifiedAt: string | null;
  updatedAt: string;
}

export interface AlertConfigResponse {
  currency: string;
  config: AlertConfig | null;
}

export interface SaveAlertBody {
  webhookUrl: string;
  threshold: number;
  enabled?: boolean;
}

export interface SaveAlertResponse {
  status: string;
  config: AlertConfig;
}

// Shared key so pages can invalidate after saving.
export const alertConfigQueryKey = () => ["alerts", "config"] as const;

// GET /api/alerts/config
export const alertConfigOpts = () =>
  queryOptions({
    queryKey: alertConfigQueryKey(),
    queryFn: () => getJSON<AlertConfigResponse>("/api/alerts/config"),
  });

// POST /api/alerts/save
export const saveAlert = (body: SaveAlertBody) =>
  postJSON<SaveAlertResponse>("/api/alerts/save", body);
