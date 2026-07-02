import { OpenAPIHono } from "@hono/zod-openapi";
import { readdir, stat } from "fs/promises";
import path from "path";

// Recursive folder-based route loader — disk path becomes URL path. Lifted
// verbatim from the house repos (text-apps-api/methods/loadRoutes.ts).
export default async function loadRoutes(app: OpenAPIHono) {
  const directory = path.join(__dirname, "../api");
  const routes = (await collectRoutes(directory)).sort((a, b) => {
    if (a.includes("[") && !b.includes("[")) return 1;
    if (!a.includes("[") && b.includes("[")) return -1;
    return 0;
  });
  const names: string[] = [];
  for (const router of routes) {
    try {
      let name = "api/" + router.replace("/index", "").replace("index", "");
      name = name.replace("[", ":").replace("]", "");
      const routeModule = await import(path.join(directory, router));
      if (routeModule.route) {
        app.openapi(routeModule.route, routeModule.default);
      } else {
        app.all(name, routeModule.default);
      }
      names.push(`/${name}`);
    } catch (e) {
      console.error(`Error loading route: /${router}`);
      console.error(e);
    }
  }
  return names;
}

const collectRoutes = async (directory: string): Promise<string[]> => {
  const routes: string[] = [];
  const files = await readdir(directory);
  for (const file of files) {
    const filePath = path.join(directory, file);
    const st = await stat(filePath);
    if (st.isDirectory()) {
      const sub = await collectRoutes(filePath);
      routes.push(...sub.map((s) => path.join(file, s)));
    } else if (file.endsWith(".ts") && !file.endsWith(".test.ts")) {
      routes.push(file.replace(".ts", ""));
    }
  }
  return routes;
};
