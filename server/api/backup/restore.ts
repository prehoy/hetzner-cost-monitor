import { defineRoute, z } from "@prehoy/baguette";
import { stageRestore } from "../../methods/backup/run";

// Stage a backup for restore. The DB is swapped in on the next boot (safe — the
// file isn't open then), so the app must be restarted to apply.
export default defineRoute({
  method: "post",
  tags: ["Backup"],
  auth: true,
  request: {
    body: z.object({
      key: z.string().optional(),
    }),
  },
  response: z.any(),
  handler: async (c, { body }) => {
    if (!body.key) return c.json({ error: "key required" }, 400);
    await stageRestore(body.key);
    return c.json({
      status: "staged",
      note: "Restart the app to apply the restore (redeploy / restart the pod).",
    });
  },
});
