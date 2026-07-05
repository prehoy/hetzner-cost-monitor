import { eq, isNull } from "drizzle-orm";
import db from "../../db/client";
import { projects, resources } from "../../db/schema";
import { classifyWaste } from "./rules";

export type WasteFinding = {
  id: number;
  category: string;
  name: string;
  location: string | null;
  projectId: number;
  projectName: string;
  monthlyCost: number;
  reason: string; // what's wrong
  fix: string; // suggested action (advisory — we never touch your infra)
};

// Scan live inventory for reclaimable spend: idle/unattached resources. Advisory
// only — read-only token, we never touch infra. NET €/mo. Single-tenant OSS: no
// userId scope. (HCM Cloud additionally flags utilization-idle servers from metrics.)
export async function detectWaste(): Promise<{ findings: WasteFinding[]; total: number }> {
  const rows = await db
    .select({
      id: resources.id,
      category: resources.category,
      name: resources.name,
      location: resources.location,
      projectId: resources.projectId,
      projectName: projects.name,
      monthlyCost: resources.monthlyCost,
      specJson: resources.specJson,
    })
    .from(resources)
    .leftJoin(projects, eq(projects.id, resources.projectId))
    .where(isNull(resources.deletedAt));

  const now = Date.now();
  const findings: WasteFinding[] = [];
  for (const r of rows) {
    let spec: Record<string, any> = {};
    try {
      spec = JSON.parse(r.specJson ?? "{}");
    } catch {
      /* ignore malformed spec */
    }
    const hit = classifyWaste(r.category, spec, now);
    if (hit && r.monthlyCost > 0) {
      findings.push({
        id: r.id,
        category: r.category,
        name: r.name ?? `${r.category} ${r.id}`,
        location: r.location,
        projectId: r.projectId,
        projectName: r.projectName ?? `project ${r.projectId}`,
        monthlyCost: r.monthlyCost,
        reason: hit.reason,
        fix: hit.fix,
      });
    }
  }
  findings.sort((a, b) => b.monthlyCost - a.monthlyCost);
  const total = findings.reduce((s, f) => s + f.monthlyCost, 0);
  return { findings, total };
}
