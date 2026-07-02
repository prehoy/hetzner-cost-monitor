import { tEnv } from "../../env";
import logger from "../logger";
import processError from "../processError";
import poll from "./poll";

// Fire-and-forget background loop. Non-overlapping: waits for each cycle before
// scheduling the next, so a slow Hetzner API can't stack polls.
export function startCollector() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await poll();
    } catch (e) {
      logger.error({ message: "Collector tick crashed", error: processError(e) });
    } finally {
      running = false;
    }
  };
  logger.info({ message: `Collector started (every ${tEnv.POLL_INTERVAL_MS}ms)` });
  tick();
  setInterval(tick, tEnv.POLL_INTERVAL_MS);
}

// Run one cycle now (used after adding a project so data shows immediately).
export { default as pollOnce } from "./poll";
