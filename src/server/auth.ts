import { getConfig } from "./env";
import { HttpError, parseCookies } from "./http";
import { rgit } from "./rgit";

export const SESSION_COOKIE = "rgit_session";

export interface SessionUser {
  user: string;
  admin: boolean;
  actor: string;
}

export function tokenFromRequest(req: Request): string | null {
  const cookies = parseCookies(req);
  return cookies[SESSION_COOKIE]?.trim() || null;
}

export async function getUserFromRequest(req: Request): Promise<SessionUser | null> {
  const token = tokenFromRequest(req);
  if (!token) return null;
  const data = (await rgit({ args: ["auth", "whoami"], token })) as SessionUser;
  if (!data?.user || data.actor === "anonymous") return null;
  return data;
}

export async function requireUser(req: Request): Promise<{ user: SessionUser; token: string }> {
  const token = tokenFromRequest(req);
  if (!token) throw new HttpError(401, "Sign in required");
  const user = await getUserFromRequest(req);
  if (!user) throw new HttpError(401, "Sign in required");
  return { user, token };
}

export function sessionCookie(token: string, maxAge = 60 * 60 * 24 * 14): string {
  const config = getConfig();
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (config.secureCookies) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(): string {
  const config = getConfig();
  const parts = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (config.secureCookies) parts.push("Secure");
  return parts.join("; ");
}
