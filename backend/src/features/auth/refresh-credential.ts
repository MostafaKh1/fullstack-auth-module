import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** A refresh credential, `<sessionId>.<secret>` on the wire (ADR 0001). */
export type RefreshCredential = { sessionId: string; secret: string };

/** A newly minted credential: `value` goes only in the cookie, `secretHash` is all that is stored. */
type MintedRefreshCredential = { value: string; secretHash: string };

const FORMAT = /^([0-9a-f]{24})\.([A-Za-z0-9_-]+)$/;

export function mintRefreshCredential(sessionId: string): MintedRefreshCredential {
  const secret = randomBytes(32).toString("base64url");
  return { value: `${sessionId}.${secret}`, secretHash: hashSecret(secret) };
}

/** The credential `value` holds, or `null` when it is not `<sessionId>.<secret>`. */
export function parseRefreshCredential(value: string): RefreshCredential | null {
  const parsed = FORMAT.exec(value);
  return parsed ? { sessionId: parsed[1], secret: parsed[2] } : null;
}

/** Compared in constant time. */
export function secretMatches(credential: RefreshCredential, storedHash: string | null): boolean {
  if (storedHash === null) return false;
  const actual = Buffer.from(hashSecret(credential.secret), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Only this hash of a refresh secret is ever stored (ADR 0001). */
function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}
