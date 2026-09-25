import { expect, test } from "bun:test";
import { buildRoutes } from "./app";
import { resetConfig } from "./env";
import { setRgitRunner } from "./rgit";

test("health is ok", async () => {
  const routes = buildRoutes() as Record<string, { GET?: () => Response }>;
  const response = routes["/api/health"]?.GET?.();
  expect(response?.status).toBe(200);
  const body = await response!.json();
  expect(body).toEqual({ ok: true, service: "rgit-web" });
});

test("repo list uses anonymous rgit", async () => {
  setRgitRunner(async (request) => {
    expect(request.anonymous).toBe(true);
    expect(request.args).toEqual(["repo", "list"]);
    return { repos: [] };
  });
  const routes = buildRoutes() as Record<string, { GET: (req: Request) => Promise<Response> }>;
  const response = await routes["/api/repos"]!.GET(new Request("http://localhost/api/repos"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ repos: [] });
  setRgitRunner(null);
});

test("login sets session cookie", async () => {
  setRgitRunner(async (request) => {
    expect(request.args.slice(0, 2)).toEqual(["auth", "login"]);
    return { token: "rgit_testtoken", user: "ada", admin: true, actor: "user" };
  });
  const routes = buildRoutes() as Record<string, { POST: (req: Request) => Promise<Response> }>;
  const response = await routes["/api/auth/login"]!.POST(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: "ada", password: "correct-horse" }),
    }),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("Set-Cookie")).toContain("rgit_session=");
  setRgitRunner(null);
});

test("signup is invite-gated and registers through rgit", async () => {
  const routes = buildRoutes() as Record<
    string,
    { GET?: (req: Request) => Response; POST: (req: Request) => Promise<Response> }
  >;
  const previous = process.env.RGIT_WEB_INVITE_CODE;
  const post = (body: unknown, cookie?: string) =>
    routes["/api/auth/signup"]!.POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify(body),
      }),
    );

  try {
    delete process.env.RGIT_WEB_INVITE_CODE;
    resetConfig();
    expect(
      await (await routes["/api/auth/signup"]!.GET!(new Request("http://localhost/api/auth/signup"))).json(),
    ).toEqual({
      enabled: false,
    });
    let called = false;
    setRgitRunner(async () => {
      called = true;
      return {};
    });
    const closed = await post({ user: "linus", password: "correct-horse", invite: "nope" });
    expect(closed.status).toBe(403);
    expect(((await closed.json()) as { error: string }).error).toBe("Sign-up is not open yet");
    expect(called).toBe(false);

    process.env.RGIT_WEB_INVITE_CODE = "beta-invite";
    resetConfig();
    expect(
      await (await routes["/api/auth/signup"]!.GET!(new Request("http://localhost/api/auth/signup"))).json(),
    ).toEqual({
      enabled: true,
    });
    const wrong = await post({ user: "linus", password: "correct-horse", invite: "wrong" });
    expect(wrong.status).toBe(403);
    expect(((await wrong.json()) as { error: string }).error).toBe("Invalid invite code");
    expect(called).toBe(false);

    const missing = await post({ user: "linus", password: "correct-horse" });
    expect(missing.status).toBe(400);

    const signedIn = await post(
      { user: "linus", password: "correct-horse", invite: "beta-invite" },
      "rgit_session=already",
    );
    expect(signedIn.status).toBe(400);
    expect(called).toBe(false);

    setRgitRunner(async (request) => {
      expect(request.anonymous).toBe(true);
      expect(request.args).toEqual(["auth", "register", "--user", "linus", "--password", "correct-horse"]);
      return { token: "rgit_newtoken", user: "linus", admin: false, actor: "user" };
    });
    const created = await post({ user: "linus", password: "correct-horse", invite: "beta-invite" });
    expect(created.status).toBe(200);
    expect(created.headers.get("Set-Cookie")).toContain("rgit_session=");
    expect(await created.json()).toEqual({ user: { user: "linus", admin: false, actor: "user" } });
  } finally {
    setRgitRunner(null);
    if (previous === undefined) delete process.env.RGIT_WEB_INVITE_CODE;
    else process.env.RGIT_WEB_INVITE_CODE = previous;
    resetConfig();
  }
});
