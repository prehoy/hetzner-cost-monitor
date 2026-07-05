import type { Context } from "hono";
import { getSession } from "./session";

// The baguette auth resolver (wired in server.ts). A route opts in with
// `defineRoute({ auth: true })`; the framework runs this, 401s on null, and sets
// the result on `c.get("user")`. Single-tenant tool, so the "user" is just the
// admin's session — routes rarely need more than the gate.
export async function authResolver(c: Context): Promise<BaguetteUserShape | null> {
  const s = await getSession(c);
  return s ? { token: s.token, userId: s.userId, expiresAt: s.expiresAt } : null;
}

type BaguetteUserShape = {
  token: string;
  userId: number;
  expiresAt: Date;
};

declare module "@prehoy/baguette" {
  interface BaguetteUser extends BaguetteUserShape {}
}
