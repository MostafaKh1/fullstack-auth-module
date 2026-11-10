import type { Response } from "express";

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
