import { existsSync } from "node:fs";
import { join } from "node:path";
import { HttpError } from "./http";

const BINARY_NAMES = ["rgit", "rabun-git"] as const;

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

export async function runRgitCli(request: RgitRequest): Promise<unknown> {
  const binary = resolveRgitBinary();
  if (!binary) {
    throw new HttpError(503, "rgit is not installed");
  }
  const args = [binary, "--json"];
  const config = process.env.RABUN_GIT_CONFIG?.trim() || process.env.RGIT_CONFIG?.trim();
  if (config) {
    args.push("--config", config);
  }
  if (request.token) {
    args.push("--token", request.token);
  } else if (request.anonymous) {
    args.push("--anonymous");
  }
  args.push(...request.args);

  const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
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
