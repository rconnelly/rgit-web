import { expect, test } from "bun:test";
import { HttpError } from "./http";
import { rgit, setRgitRunner } from "./rgit";

test("injectable runner returns JSON", async () => {
  setRgitRunner(async (request) => {
    expect(request.args).toEqual(["repo", "list"]);
    expect(request.anonymous).toBe(true);
    return { repos: [{ name: "ada/app" }] };
  });
  const data = (await rgit({ args: ["repo", "list"], anonymous: true })) as { repos: { name: string }[] };
  expect(data.repos[0]?.name).toBe("ada/app");
  setRgitRunner(null);
});

test("missing binary is 503", async () => {
  setRgitRunner(null);
  const previous = process.env.RGIT_BIN;
  const previousRabun = process.env.RABUN_GIT_BIN;
  process.env.RGIT_BIN = "/no/such/rgit";
  process.env.RABUN_GIT_BIN = "/no/such/rgit";
  try {
    await rgit({ args: ["repo", "list"], anonymous: true });
    throw new Error("expected failure");
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(503);
  } finally {
    if (previous === undefined) delete process.env.RGIT_BIN;
    else process.env.RGIT_BIN = previous;
    if (previousRabun === undefined) delete process.env.RABUN_GIT_BIN;
    else process.env.RABUN_GIT_BIN = previousRabun;
  }
});
