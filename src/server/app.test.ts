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

test("device start and poll are anonymous", async () => {
  const routes = buildRoutes() as Record<string, { POST: (req: Request) => Promise<Response> }>;
  setRgitRunner(async (request) => {
    expect(request.anonymous).toBe(true);
    expect(request.args[0]).toBe("auth");
    expect(request.args[1]).toBe("device");
    if (request.args[2] === "start") {
      expect(request.args).toEqual([
        "auth",
        "device",
        "start",
        "--public-key",
        "ssh-ed25519 AAAA",
        "--hostname",
        "laptop",
      ]);
      return {
        user_code: "ABCD-EFGH",
        device_code: "secret",
        verification_uri: "/login/device",
        expires_in: 900,
        interval: 5,
      };
    }
    expect(request.args).toEqual(["auth", "device", "poll", "--device-code", "secret"]);
    return { status: "pending" };
  });
  const started = await routes["/api/auth/device/start"]!.POST(
    new Request("http://localhost/api/auth/device/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_key: "ssh-ed25519 AAAA", hostname: "laptop" }),
    }),
  );
  expect(started.status).toBe(200);
  expect(await started.json()).toMatchObject({ user_code: "ABCD-EFGH", device_code: "secret" });
  const polled = await routes["/api/auth/device/poll"]!.POST(
    new Request("http://localhost/api/auth/device/poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_code: "secret" }),
    }),
  );
  expect(polled.status).toBe(200);
  expect(await polled.json()).toEqual({ status: "pending" });
  setRgitRunner(null);
});

test("device approve requires a session", async () => {
  const routes = buildRoutes() as Record<
    string,
    { GET?: (req: Request) => Promise<Response>; POST: (req: Request) => Promise<Response> }
  >;
  const denied = await routes["/api/auth/device/approve"]!.POST(
    new Request("http://localhost/api/auth/device/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_code: "ABCD-EFGH" }),
    }),
  );
  expect(denied.status).toBe(401);

  setRgitRunner(async (request) => {
    if (request.args[1] === "whoami") {
      expect(request.token).toBe("rgit_session");
      return { user: "ada", admin: true, actor: "user" };
    }
    expect(request.args).toEqual(["auth", "device", "approve", "--user-code", "ABCD-EFGH"]);
    return { ok: true, user: "ada", added: 1 };
  });
  const cookie = "rgit_session=rgit_session";
  const approved = await routes["/api/auth/device/approve"]!.POST(
    new Request("http://localhost/api/auth/device/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ user_code: "ABCD-EFGH" }),
    }),
  );
  expect(approved.status).toBe(200);
  expect(await approved.json()).toEqual({ ok: true, user: "ada", added: 1 });

  setRgitRunner(async (request) => {
    if (request.args[1] === "whoami") {
      return { user: "ada", admin: true, actor: "user" };
    }
    expect(request.args).toEqual(["auth", "device", "show", "--user-code", "ABCD-EFGH"]);
    return {
      user_code: "ABCD-EFGH",
      hostname: "laptop",
      fingerprint: "SHA256:abc",
      status: "pending",
      expires_at: "2030-01-01T00:00:00.000Z",
    };
  });
  const shown = await routes["/api/auth/device/:code"]!.GET!(
    Object.assign(new Request("http://localhost/api/auth/device/ABCD-EFGH", { headers: { cookie } }), {
      params: { code: "ABCD-EFGH" },
    }),
  );
  expect(shown.status).toBe(200);
  expect(await shown.json()).toMatchObject({ hostname: "laptop", fingerprint: "SHA256:abc" });
  setRgitRunner(null);
});
