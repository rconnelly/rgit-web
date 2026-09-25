import { expect, test } from "bun:test";
import { loginPath, safeNext, signupPath } from "./redirect";

test("safeNext only allows relative paths", () => {
  expect(safeNext(null)).toBe("/");
  expect(safeNext("/login/device?code=ABCD-EFGH")).toBe("/login/device?code=ABCD-EFGH");
  expect(safeNext("//evil.example")).toBe("/");
  expect(safeNext("https://evil.example")).toBe("/");
});

test("login and signup preserve next", () => {
  expect(loginPath("/login/device?code=A")).toBe("/login?next=%2Flogin%2Fdevice%3Fcode%3DA");
  expect(signupPath("/login/device")).toBe("/signup?next=%2Flogin%2Fdevice");
  expect(loginPath("/")).toBe("/login");
});
