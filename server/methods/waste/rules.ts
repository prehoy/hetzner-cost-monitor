// Pure waste rules — no I/O, so the self-check runs standalone. All signals come
// from what the collector already stores in a resource's spec (no extra API calls).
// OSS edition: current-state rules only. (HCM Cloud adds metric-based idle
// detection from sampled CPU — that needs the server-metrics collector.)

export const SNAPSHOT_STALE_DAYS = 90;

type Spec = Record<string, any>;

export function classifyWaste(
  category: string,
  spec: Spec,
  nowMs: number,
): { reason: string; fix: string } | null {
  switch (category) {
    case "volume":
      if (spec.attached === false)
        return { reason: "Not attached to any server", fix: "Delete it, or attach it where it's needed — you pay per GB either way." };
      return null;
    case "floating_ip":
      if (spec.assigned === false)
        return { reason: "Not assigned to any server", fix: "Assign it, or release it to stop the monthly charge." };
      return null;
    case "primary_ip":
      if (spec.assignee == null)
        return { reason: "Not assigned to any server", fix: "Assign it to a server, or delete it." };
      return null;
    case "server":
      if (spec.status === "off")
        return { reason: "Powered off but still billed", fix: "Hetzner bills stopped servers in full. Snapshot + delete if you don't need it." };
      return null;
    case "load_balancer":
      if ((spec.targets ?? 0) === 0)
        return { reason: "No targets attached", fix: "Add targets, or delete the load balancer." };
      return null;
    case "snapshot": {
      if (!spec.created) return null;
      const ageDays = Math.floor((nowMs - new Date(spec.created).getTime()) / 86_400_000);
      if (ageDays > SNAPSHOT_STALE_DAYS)
        return { reason: `Snapshot is ${ageDays} days old`, fix: "Delete it if it's no longer needed — snapshots bill per GB indefinitely." };
      return null;
    }
    default:
      return null;
  }
}

// ponytail: one runnable check on the waste rules (the money path).
if (import.meta.main) {
  const t = (b: boolean, m: string) => {
    if (!b) throw new Error("FAIL: " + m);
  };
  const now = Date.UTC(2026, 6, 3);
  t(!!classifyWaste("volume", { attached: false }, now), "unattached volume = waste");
  t(!classifyWaste("volume", { attached: true }, now), "attached volume = ok");
  t(!!classifyWaste("floating_ip", { assigned: false }, now), "unassigned floating ip = waste");
  t(!!classifyWaste("primary_ip", { assignee: null }, now), "unassigned primary ip = waste");
  t(!classifyWaste("primary_ip", { assignee: 123 }, now), "assigned primary ip = ok");
  t(!!classifyWaste("server", { status: "off" }, now), "off server = waste");
  t(!classifyWaste("server", { status: "running" }, now), "running server = ok");
  t(!!classifyWaste("load_balancer", { targets: 0 }, now), "empty lb = waste");
  t(!classifyWaste("load_balancer", { targets: 2 }, now), "lb with targets = ok");
  t(!!classifyWaste("snapshot", { created: new Date(now - 200 * 86_400_000).toISOString() }, now), "old snapshot = waste");
  t(!classifyWaste("snapshot", { created: new Date(now - 10 * 86_400_000).toISOString() }, now), "fresh snapshot = ok");
  console.log("waste rules ok");
}
