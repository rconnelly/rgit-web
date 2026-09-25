import { expect, test } from "bun:test";
import { buildRoutes } from "./app";
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
