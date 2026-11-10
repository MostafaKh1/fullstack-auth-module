import type { Request, Response } from "express";

export const REFRESH_COOKIE = "refresh_credential";

// The cookie travels only to the auth routes, never to the rest of the API (ADR 0001).
const REFRESH_COOKIE_PATH = "/api/auth";

/** Sets the refresh cookie: script-unreadable, same-site, scoped to the auth routes, expiring with the Session's idle window. */
export function setRefreshCookie(
  response: Response,
  credential: string,
  options: { maxAgeMs: number; secure: boolean },
): void {
  response.cookie(REFRESH_COOKIE, credential, {
    httpOnly: true,
    sameSite: "lax",
    secure: options.secure,
    path: REFRESH_COOKIE_PATH,
    maxAge: options.maxAgeMs,
  });
}

/** The refresh credential the request's `Cookie` header carries, or `null` when there is none. */
export function readRefreshCookie(request: Request): string | null {
  for (const pair of (request.headers.cookie ?? "").split(";")) {
    const separator = pair.indexOf("=");
    if (separator === -1 || pair.slice(0, separator).trim() !== REFRESH_COOKIE) continue;
    try {
      return decodeURIComponent(pair.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}
