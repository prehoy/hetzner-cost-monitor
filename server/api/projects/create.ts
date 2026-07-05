import { defineRoute, z } from "@prehoy/baguette";
import db from "../../db/client";
import { projects } from "../../db/schema";
import { pollOnce } from "../../methods/collector/start";
import { encrypt } from "../../methods/crypto";
import { hetznerGet } from "../../methods/hetzner/client";

export default defineRoute({
  method: "post",
  tags: ["Projects"],
  auth: true,
  request: {
    body: z.object({
      name: z.string().optional(),
      token: z.string().optional(),
    }),
  },
  response: z.any(),
  handler: async (c, { body }) => {
    if (!body.name || !body.token) return c.json({ error: "Missing name or token" }, 400);

    // Validate the token against Hetzner before storing it.
    try {
      await hetznerGet(body.token, "/servers?per_page=1");
    } catch {
      return c.json({ error: "Token rejected by Hetzner API" }, 400);
    }

    const { ciphertext, iv } = encrypt(body.token);
    const [project] = await db
      .insert(projects)
      .values({ name: body.name, tokenEncrypted: ciphertext, tokenIv: iv })
      .returning({ id: projects.id, name: projects.name });

    // Fire a poll so data shows up without waiting for the next tick.
    pollOnce().catch(() => {});
    return c.json({ status: "success", project });
  },
});
