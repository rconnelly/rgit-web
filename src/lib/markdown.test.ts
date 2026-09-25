import { expect, test } from "bun:test";
import { renderMarkdown } from "./markdown";

test("renders headings links and code", () => {
  const html = renderMarkdown("# Title\n\nSee [docs](https://rgit.rs) and `rgit`.\n\n```\ncode\n```\n");
  expect(html).toContain("<h1>Title</h1>");
  expect(html).toContain('href="https://rgit.rs"');
  expect(html).toContain("<code>rgit</code>");
  expect(html).toContain("<pre><code>code</code></pre>");
});

test("escapes html", () => {
  const html = renderMarkdown("<script>alert(1)</script>");
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
});
