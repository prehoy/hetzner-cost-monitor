import { tEnv } from "../env";
import processError from "./processError";

// Structured JSON logger to stdout (same shape as the house repos).
const transport = (level: string, message: string | object) => {
  try {
    const messageObject =
      typeof message === "string" ? { message } : (message as Record<string, any>);
    const logObject = { level, app: tEnv.APP_NAME, ...messageObject };
    console.log(JSON.stringify(logObject));
  } catch (error) {
    console.log("Logger Error", processError(error));
  }
};

const logger = {
  info: (payload: string | object) => transport("info", payload),
  warn: (payload: string | object) => transport("warn", payload),
  error: (payload: string | object) => transport("error", payload),
};
export default logger;
