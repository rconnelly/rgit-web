import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { createElement } from "react";
import { WelcomeEmpty } from "./WelcomeEmpty";

test("guest welcome sells the forge and points to sign-up", () => {
  const html = renderToString(
    createElement(MemoryRouter, null, createElement(WelcomeEmpty, { user: null })),
  );
  expect(html).toContain("Code. Review. Land.");
  expect(html).toContain("Create an account");
  expect(html).toContain("/signup");
  expect(html).toContain("/login");
  expect(html).toContain("Browse");
  expect(html).toContain("Requests");
  expect(html).toContain("Clone");
  expect(html).toContain("Invite-only");
  expect(html).toContain("acme/ledger");
  expect(html).toContain("SSH.");
  expect(html).not.toContain("2222");
  expect(html).toContain("ssh://git@host/acme/ledger");
  expect(html).toContain("Rgit is Git with etiquette.");
  expect(html).toContain("https://docs.rgit.rs");
});

test("signed-in welcome points at new repository", () => {
  const html = renderToString(
    createElement(
      MemoryRouter,
      null,
      createElement(WelcomeEmpty, { user: { user: "ada", admin: false, actor: "ada" } }),
    ),
  );
  expect(html).toContain("First repo. Then the work.");
  expect(html).toContain("#new-repo");
  expect(html).toContain("Rgit is Git with etiquette.");
  expect(html).not.toContain("Create an account");
});
