import { type Context } from "hono";
import routeError from "./routeError";

export default async function routeHandler(props: {
  name: string;
  c: Context;
  handler: Function;
}) {
  const timeStart = Date.now();
  try {
    const r = await props.handler(props.c);
    console.log(`Route ${props.name} took ${Date.now() - timeStart}ms`);
    return r;
  } catch (e) {
    return routeError({ name: props.name, e, context: props.c });
  }
}
