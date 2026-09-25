import { existsSync } from "node:fs";
import { join } from "node:path";
import { HttpError } from "./http";

const BINARY_NAMES = ["rgit", "rabun-git"] as const;
const SYSTEM_FORGE_CONFIG = "/etc/rabun-git/rabun-git.toml";
const SYSTEM_FORGE_ROOT = "/var/lib/rabun-git";

export interface RgitRequest {
  args: string[];
  token?: string | null;
  anonymous?: boolean;
}

export type RgitRunner = (request: RgitRequest) => Promise<unknown>;

let runner: RgitRunner = runRgitCli;

export function setRgitRunner(next: RgitRunner | null): void {
  runner = next ?? runRgitCli;
}

export function rgit(request: RgitRequest): Promise<unknown> {
  return runner(request);
}

export function resolveRgitBinary(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): string | null {
  const explicit = env.RGIT_BIN?.trim() || env.RABUN_GIT_BIN?.trim();
  if (explicit) {
    return existsSync(explicit) ? explicit : null;
  }
  for (const name of BINARY_NAMES) {
    const which = Bun.which(name);
    if (which) return which;
  }
  const siblings = [
    join(cwd, "..", "rabun-git", "target", "release", "rabun-git"),
    join(cwd, "..", "rabun-git", "target", "debug", "rabun-git"),
    "/usr/local/bin/rgit",
    "/usr/local/bin/rabun-git",
  ];
  return siblings.find((path) => existsSync(path)) ?? null;
}

/** Env for spawned `rgit`. System config without `RABUN_GIT_ROOT` would otherwise use cwd `data/git`. */
export function rgitProcessEnv(env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) out[key] = value;
  }
  const config = out.RABUN_GIT_CONFIG?.trim() || out.RGIT_CONFIG?.trim();
  if (!out.RABUN_GIT_ROOT?.trim() && config === SYSTEM_FORGE_CONFIG) {
    out.RABUN_GIT_ROOT = SYSTEM_FORGE_ROOT;
  }
  return out;
}

export async function runRgitCli(request: RgitRequest): Promise<unknown> {
  const binary = resolveRgitBinary();
  if (!binary) {
    throw new HttpError(503, "rgit is not installed");
  }
  const env = rgitProcessEnv();
  const args = [binary, "--json"];
  const config = env.RABUN_GIT_CONFIG?.trim() || env.RGIT_CONFIG?.trim();
  if (config) {
    args.push("--config", config);
  }
  if (request.token) {
    args.push("--token", request.token);
  } else if (request.anonymous) {
    args.push("--anonymous");
  }
  args.push(...request.args);

  const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe", env });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  const parsed = parseJson(stdout);
  if (exitCode !== 0) {
    const message =
      (parsed && typeof parsed === "object" && "error" in parsed && typeof parsed.error === "string"
        ? parsed.error
        : firstLine(stderr || stdout)) || "rgit failed";
    throw new HttpError(rgitStatus(message, exitCode), message);
  }
  if (parsed === undefined) {
    throw new HttpError(502, firstLine(stderr) || "rgit returned no JSON");
  }
  return parsed;
}

function parseJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function rgitStatus(message: string, exitCode: number): number {
  if (/already exists/i.test(message)) return 409;
  if (/already signed in/i.test(message)) return 400;
  if (/not found|no access|invalid token|invalid user or password|sign in/i.test(message)) {
    if (/invalid user or password|invalid token/i.test(message)) return 401;
    if (/no access|sign in/i.test(message)) return 403;
    return 404;
  }
  if (/need |must be |requires |pass --/i.test(message)) return 400;
  return exitCode === 0 ? 200 : 502;
}

function firstLine(value: string): string {
  return value.trim().split("\n")[0]?.trim() ?? "";
}
