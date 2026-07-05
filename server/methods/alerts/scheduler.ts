import { tEnv } from "../../env";
import logger from "../logger";
import processError from "../processError";
import { evaluateAlert } from "./evaluate";

// Fire-and-forget interval — evaluate the spend rule every ALERT_INTERVAL_MS.
// Single self-hosted instance, so a plain setInterval is enough (no HA lock).
export function startAlerts(): void {
  const tick = async () => {
    try {
      await evaluateAlert();
    } catch (e) {
      logger.error({ message: "Alert tick crashed", error: processError(e) });
    }
  };
  tick();
  setInterval(tick, tEnv.ALERT_INTERVAL_MS);
}
