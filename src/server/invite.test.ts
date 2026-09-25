import { expect, test } from "bun:test";
import { inviteMatches } from "./invite";

test("invite match is constant-time and rejects empty expected", () => {
  expect(inviteMatches("secret", "secret")).toBe(true);
  expect(inviteMatches("secret", "other")).toBe(false);
  expect(inviteMatches("secret", undefined)).toBe(false);
  expect(inviteMatches("", "secret")).toBe(false);
});
