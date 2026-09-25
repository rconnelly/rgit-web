import { serve } from "bun";
import index from "./index.html";
import { buildRoutes } from "./server/app";
import { getConfig } from "./server/env";

const config = getConfig();

const server = serve({
  port: config.listen.port,
  ...(config.listen.hostname ? { hostname: config.listen.hostname } : {}),
  routes: {
    ...buildRoutes(),
    "/": index,
    "/*": index,
  },
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
  error(error) {
    console.error(error);
    return new Response("Internal server error", { status: 500 });
  },
});

console.log(`rgit-web ${server.url}`);
