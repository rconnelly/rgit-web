import { clearSessionCookie, getUserFromRequest, requireUser, sessionCookie, tokenFromRequest } from "./auth";
import { getConfig } from "./env";
import { errorResponse, HttpError, isHttpError, json, readBody } from "./http";
import { inviteMatches } from "./invite";
import { rgit } from "./rgit";

type RepoParams = { owner: string; name: string };
type RequestParams = RepoParams & { id: string };

function repoName(params: RepoParams): string {
  return `${params.owner}/${params.name}`;
}

function actorOpts(req: Request): { token?: string; anonymous?: boolean } {
  const token = tokenFromRequest(req);
  if (token) return { token };
  return { anonymous: true };
}

async function sessionFromRgit(args: string[]): Promise<Response> {
  const session = (await rgit({ args, anonymous: true })) as {
    token?: string;
    user: string;
    admin: boolean;
    actor: string;
  };
  if (!session.token) throw new HttpError(502, "rgit did not return a token");
  return json(
    { user: { user: session.user, admin: session.admin, actor: session.actor } },
    { headers: { "Set-Cookie": sessionCookie(session.token) } },
  );
}

async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (isHttpError(error)) return errorResponse(error.message, error.status);
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error(error);
    return errorResponse(message, 500);
  }
}

export function buildRoutes(): Record<string, unknown> {
  return {
    "/api/health": {
      GET: () => json({ ok: true, service: "rgit-web" }),
    },
    "/api/auth/me": {
      GET: (req: Request) =>
        handle(async () => {
          const user = await getUserFromRequest(req);
          return json({ user });
        }),
    },
    "/api/auth/login": {
      POST: (req: Request) =>
        handle(async () => {
          const body = await readBody<{ user?: string; password?: string }>(req);
          if (!body.user?.trim() || !body.password) {
            throw new HttpError(400, "user and password are required");
          }
          return sessionFromRgit(["auth", "login", "--user", body.user.trim(), "--password", body.password]);
        }),
    },
    "/api/auth/signup": {
      GET: () => json({ enabled: Boolean(getConfig().inviteCode) }),
      POST: (req: Request) =>
        handle(async () => {
          if (tokenFromRequest(req)) {
            throw new HttpError(400, "already signed in");
          }
          const body = await readBody<{ user?: string; password?: string; invite?: string }>(req);
          const name = body.user?.trim() ?? "";
          const password = body.password ?? "";
          const invite = body.invite ?? "";
          if (!name || !password || !invite.trim()) {
            throw new HttpError(400, "user, password, and invite code are required");
          }
          const expected = getConfig().inviteCode;
          if (!expected) {
            throw new HttpError(403, "Sign-up is not open yet");
          }
          if (!inviteMatches(invite.trim(), expected)) {
            throw new HttpError(403, "Invalid invite code");
          }
          return sessionFromRgit(["auth", "register", "--user", name, "--password", password]);
        }),
    },
    "/api/auth/logout": {
      POST: (req: Request) =>
        handle(async () => {
          const token = tokenFromRequest(req);
          if (token) {
            try {
              await rgit({ args: ["auth", "logout"], token });
            } catch {
              /* already invalid */
            }
          }
          return json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
        }),
    },
    "/api/auth/device/start": {
      POST: (req: Request) =>
        handle(async () => {
          const body = await readBody<{ public_key?: string; hostname?: string }>(req);
          if (!body.public_key?.trim()) {
            throw new HttpError(400, "public_key is required");
          }
          const args = ["auth", "device", "start", "--public-key", body.public_key.trim()];
          if (body.hostname?.trim()) args.push("--hostname", body.hostname.trim());
          return json(await rgit({ args, anonymous: true }));
        }),
    },
    "/api/auth/device/poll": {
      POST: (req: Request) =>
        handle(async () => {
          const body = await readBody<{ device_code?: string }>(req);
          if (!body.device_code?.trim()) {
            throw new HttpError(400, "device_code is required");
          }
          return json(
            await rgit({
              args: ["auth", "device", "poll", "--device-code", body.device_code.trim()],
              anonymous: true,
            }),
          );
        }),
    },
    "/api/auth/device/approve": {
      POST: (req: Request) =>
        handle(async () => {
          const { token } = await requireUser(req);
          const body = await readBody<{ user_code?: string }>(req);
          if (!body.user_code?.trim()) throw new HttpError(400, "user_code is required");
          return json(
            await rgit({
              args: ["auth", "device", "approve", "--user-code", body.user_code.trim()],
              token,
            }),
          );
        }),
    },
    "/api/auth/device/deny": {
      POST: (req: Request) =>
        handle(async () => {
          const { token } = await requireUser(req);
          const body = await readBody<{ user_code?: string }>(req);
          if (!body.user_code?.trim()) throw new HttpError(400, "user_code is required");
          return json(
            await rgit({
              args: ["auth", "device", "deny", "--user-code", body.user_code.trim()],
              token,
            }),
          );
        }),
    },
    "/api/auth/device/:code": {
      GET: (req: Request & { params: { code: string } }) =>
        handle(async () => {
          const { token } = await requireUser(req);
          const code = req.params.code?.trim();
          if (!code) throw new HttpError(400, "user_code is required");
          return json(await rgit({ args: ["auth", "device", "show", "--user-code", code], token }));
        }),
    },
    "/api/repos": {
      GET: (req: Request) =>
        handle(async () => json(await rgit({ args: ["repo", "list"], ...actorOpts(req) }))),
      POST: (req: Request) =>
        handle(async () => {
          const { token } = await requireUser(req);
          const body = await readBody<{ name?: string; public?: boolean }>(req);
          if (!body.name?.trim()) throw new HttpError(400, "name is required");
          const args = ["repo", "create", body.name.trim()];
          if (body.public) args.push("--public");
          return json(await rgit({ args, token }), 201);
        }),
    },
    "/api/repos/:owner/:name": {
      GET: (req: Request & { params: RepoParams }) =>
        handle(async () =>
          json(await rgit({ args: ["repo", "show", repoName(req.params)], ...actorOpts(req) })),
        ),
    },
    "/api/repos/:owner/:name/visibility": {
      POST: (req: Request & { params: RepoParams }) =>
        handle(async () => {
          const { token } = await requireUser(req);
          const body = await readBody<{ public?: boolean }>(req);
          const flag = body.public ? "--public" : "--private";
          return json(
            await rgit({ args: ["repo", "visibility", repoName(req.params), flag], token }),
          );
        }),
    },
    "/api/repos/:owner/:name/tree": {
      GET: (req: Request & { params: RepoParams }) =>
        handle(async () => {
          const url = new URL(req.url);
          const gitRef = url.searchParams.get("ref") || "HEAD";
          const path = url.searchParams.get("path") || "";
          const args = ["repo", "tree", repoName(req.params), "--ref", gitRef];
          if (path) args.push("--path", path);
          return json(await rgit({ args, ...actorOpts(req) }));
        }),
    },
    "/api/repos/:owner/:name/blob": {
      GET: (req: Request & { params: RepoParams }) =>
        handle(async () => {
          const url = new URL(req.url);
          const gitRef = url.searchParams.get("ref") || "HEAD";
          const path = url.searchParams.get("path") || "";
          if (!path) throw new HttpError(400, "path is required");
          return json(
            await rgit({
              args: ["repo", "blob", repoName(req.params), "--ref", gitRef, "--path", path],
              ...actorOpts(req),
            }),
          );
        }),
    },
    "/api/repos/:owner/:name/blame": {
      GET: (req: Request & { params: RepoParams }) =>
        handle(async () => {
          const url = new URL(req.url);
          const gitRef = url.searchParams.get("ref") || "HEAD";
          const path = url.searchParams.get("path") || "";
          if (!path) throw new HttpError(400, "path is required");
          return json(
            await rgit({
              args: ["repo", "blame", repoName(req.params), "--ref", gitRef, "--path", path],
              ...actorOpts(req),
            }),
          );
        }),
    },
    "/api/repos/:owner/:name/log": {
      GET: (req: Request & { params: RepoParams }) =>
        handle(async () => {
          const url = new URL(req.url);
          const gitRef = url.searchParams.get("ref") || "HEAD";
          const path = url.searchParams.get("path");
          const limit = url.searchParams.get("limit") || "50";
          const args = ["repo", "log", repoName(req.params), "--ref", gitRef, "--limit", limit];
          if (path) args.push("--path", path);
          return json(await rgit({ args, ...actorOpts(req) }));
        }),
    },
    "/api/repos/:owner/:name/commit/:sha": {
      GET: (req: Request & { params: RepoParams & { sha: string } }) =>
        handle(async () =>
          json(
            await rgit({
              args: ["repo", "commit", repoName(req.params), req.params.sha],
              ...actorOpts(req),
            }),
          ),
        ),
    },
    "/api/repos/:owner/:name/refs": {
      GET: (req: Request & { params: RepoParams }) =>
        handle(async () =>
          json(await rgit({ args: ["repo", "refs", repoName(req.params)], ...actorOpts(req) })),
        ),
    },
    "/api/repos/:owner/:name/diff": {
      GET: (req: Request & { params: RepoParams }) =>
        handle(async () => {
          const url = new URL(req.url);
          const base = url.searchParams.get("base");
          const head = url.searchParams.get("head");
          if (!base || !head) throw new HttpError(400, "base and head are required");
          return json(
            await rgit({
              args: ["repo", "diff", repoName(req.params), "--base", base, "--head", head],
              ...actorOpts(req),
            }),
          );
        }),
    },
    "/api/repos/:owner/:name/requests": {
      GET: (req: Request & { params: RepoParams }) =>
        handle(async () =>
          json(await rgit({ args: ["request", "list", repoName(req.params)], ...actorOpts(req) })),
        ),
      POST: (req: Request & { params: RepoParams }) =>
        handle(async () => {
          const { token } = await requireUser(req);
          const body = await readBody<{ head?: string; base?: string; title?: string; body?: string }>(req);
          if (!body.head?.trim() || !body.title?.trim()) {
            throw new HttpError(400, "head and title are required");
          }
          const args = [
            "request",
            "create",
            repoName(req.params),
            "--head",
            body.head.trim(),
            "--title",
            body.title.trim(),
          ];
          if (body.base?.trim()) args.push("--base", body.base.trim());
          if (body.body?.trim()) args.push("--body", body.body.trim());
          return json(await rgit({ args, token }), 201);
        }),
    },
    "/api/repos/:owner/:name/requests/:id": {
      GET: (req: Request & { params: RequestParams }) =>
        handle(async () =>
          json(
            await rgit({
              args: ["request", "show", repoName(req.params), req.params.id],
              ...actorOpts(req),
            }),
          ),
        ),
    },
    "/api/repos/:owner/:name/requests/:id/review": {
      POST: (req: Request & { params: RequestParams }) =>
        handle(async () => {
          const { token } = await requireUser(req);
          const body = await readBody<{ verdict?: string; comment?: string }>(req);
          const args = ["request", "review", repoName(req.params), req.params.id];
          if (body.verdict === "approve") args.push("--approve");
          else if (body.verdict === "reject") args.push("--reject");
          if (body.comment?.trim()) args.push("--comment", body.comment.trim());
          return json(await rgit({ args, token }));
        }),
    },
    "/api/repos/:owner/:name/requests/:id/merge": {
      POST: (req: Request & { params: RequestParams }) =>
        handle(async () => {
          const { token } = await requireUser(req);
          return json(
            await rgit({
              args: ["request", "merge", repoName(req.params), req.params.id],
              token,
            }),
          );
        }),
    },
    "/api/repos/:owner/:name/requests/:id/diff": {
      GET: (req: Request & { params: RequestParams }) =>
        handle(async () =>
          json(
            await rgit({
              args: ["request", "diff", repoName(req.params), req.params.id],
              ...actorOpts(req),
            }),
          ),
        ),
    },
  };
}
