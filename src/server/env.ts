export interface AppConfig {
  listen: {
    port: number;
    hostname: string | undefined;
  };
  rgitBin: string | undefined;
  rgitConfig: string | undefined;
  secureCookies: boolean;
}

function inferListen(env: NodeJS.ProcessEnv): AppConfig["listen"] {
  const raw = env.RGIT_WEB_PORT?.trim() || env.PORT?.trim() || "3010";
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid RGIT_WEB_PORT/PORT: ${raw}`);
  }
  const hostname = env.RGIT_WEB_HOSTNAME?.trim() || undefined;
  return { port, hostname };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const forwarded = env.RGIT_WEB_SECURE_COOKIES?.trim() || env.X_FORWARDED_PROTO?.trim();
  const secureCookies =
    env.NODE_ENV === "production" || forwarded === "https" || forwarded === "1" || forwarded === "true";
  return {
    listen: inferListen(env),
    rgitBin: env.RGIT_BIN?.trim() || env.RABUN_GIT_BIN?.trim() || undefined,
    rgitConfig: env.RABUN_GIT_CONFIG?.trim() || env.RGIT_CONFIG?.trim() || undefined,
    secureCookies,
  };
}

let cached: AppConfig | undefined;

export function getConfig(): AppConfig {
  return (cached ??= loadConfig());
}

export function resetConfig(): void {
  cached = undefined;
}
