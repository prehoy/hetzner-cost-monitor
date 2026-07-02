import type { Context } from "hono";
import processError from "./processError";
import stringifyError from "./stringifyError";
import logger from "./logger";

export default function routeError(props: { name: string; e: any; context: Context }) {
  logger.error({
    message: `Error in route: ${props.name}`,
    error: stringifyError(props.e),
    process_id: props.context.get("process_id"),
  });
  return props.context.json(
    { error: "Internal server error on route " + props.name, message: processError(props.e) },
    500,
  );
}
