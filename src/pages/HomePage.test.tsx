import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { createElement } from "react";
import { AuthProvider } from "@/lib/auth";
import { HomePage } from "./HomePage";

test("home always shows welcome above the repository list", () => {
  const html = renderToString(
    createElement(MemoryRouter, null, createElement(AuthProvider, null, createElement(HomePage))),
  );
  expect(html).toContain("Code. Review. Land.");
  expect(html).toContain("Repositories");
  expect(html.indexOf("Code. Review. Land.")).toBeLessThan(html.indexOf("Repositories"));
});
