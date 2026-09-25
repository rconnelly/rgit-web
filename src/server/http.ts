export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function isHttpError(error: unknown): error is HttpError {
  if (error instanceof HttpError) return true;
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { name?: unknown; status?: unknown; message?: unknown };
  return candidate.name === "HttpError" && typeof candidate.status === "number" && typeof candidate.message === "string";
}

export function json(data: unknown, init: number | ResponseInit = 200): Response {
  const options: ResponseInit = typeof init === "number" ? { status: init } : init;
  return Response.json(data, options);
}

export function errorResponse(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export async function readBody<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.get("cookie") ?? "";
  const cookies: Record<string, string> = {};
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = decodeURIComponent(trimmed.slice(0, eq).trim());
    const value = decodeURIComponent(trimmed.slice(eq + 1).trim());
    cookies[key] = value;
  }
  return cookies;
}
