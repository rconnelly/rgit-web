/** Allow only same-origin relative paths for post-login redirects. */
export function safeNext(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (raw.includes("://")) return fallback;
  return raw;
}

/** `/login?next=…` preserving an existing next query. */
export function loginPath(next?: string | null): string {
  const dest = safeNext(next, "");
  if (!dest || dest === "/") return "/login";
  return `/login?next=${encodeURIComponent(dest)}`;
}

/** `/signup?next=…` */
export function signupPath(next?: string | null): string {
  const dest = safeNext(next, "");
  if (!dest || dest === "/") return "/signup";
  return `/signup?next=${encodeURIComponent(dest)}`;
}
