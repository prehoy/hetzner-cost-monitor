import type { RouteConfig } from "@hono/zod-openapi";

const ErrorSchema: RouteConfig["responses"][0] = {
  description: "Error",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: {
            type: "object",
            properties: { error_message: { type: "string" } },
            required: ["error_message"],
          },
        },
        required: ["error"],
      },
    },
  },
};
export default ErrorSchema;
