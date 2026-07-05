import { defineRoute, z } from "@prehoy/baguette";
import { runBackup } from "../../methods/backup/run";

// Trigger a backup right now.
export default defineRoute({
  method: "post",
  tags: ["Backup"],
  auth: true,
  response: z.any(),
  handler: async (c) => {
    const { key, size } = await runBackup();
    return c.json({ status: "success", key, size });
  },
});
