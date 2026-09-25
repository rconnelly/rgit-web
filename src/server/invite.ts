import { createHash, timingSafeEqual } from "node:crypto";

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/** Constant-time compare of invite codes. Empty expected means sign-up is closed. */
export function inviteMatches(provided: string, expected: string | undefined): boolean {
  if (!expected) return false;
  return timingSafeEqual(sha256(provided), sha256(expected));
}
