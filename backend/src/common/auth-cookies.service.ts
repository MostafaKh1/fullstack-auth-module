import { Injectable } from "@nestjs/common";
import type { Request, Response } from "express";
import { AppConfigService } from "../config/app-config.service";
import { ClockService } from "../core/clock.service";

export const REFRESH_COOKIE = "refresh_credential";

// The cookie travels only to the auth routes, never to the rest of the API (ADR 0001).
const REFRESH_COOKIE_PATH = "/api/auth";

/** The refresh cookie's whole policy: its name, its attributes, and reading it back. */
@Injectable()
export class AuthCookiesService {
  constructor(
    private readonly config: AppConfigService,
    private readonly clock: ClockService,
  ) {}

  /** Sets the refresh cookie: script-unreadable, same-site, scoped to the auth routes, expiring with the Session's idle window. */
  setRefreshCookie(response: Response, credential: string, idleExpiresAt: Date): void {
    const maxAgeSeconds = Math.floor((idleExpiresAt.getTime() - this.clock.now().getTime()) / 1000);
    // Written by hand: Express's `res.cookie` derives `Expires` from the real clock, not from the Session.
    const attributes = [
      `${REFRESH_COOKIE}=${encodeURIComponent(credential)}`,
      `Max-Age=${maxAgeSeconds}`,
      `Path=${REFRESH_COOKIE_PATH}`,
      `Expires=${idleExpiresAt.toUTCString()}`,
      "HttpOnly",
      ...(this.config.get("cookieSecure") ? ["Secure"] : []),
      "SameSite=Lax",
    ];
    response.append("Set-Cookie", attributes.join("; "));
  }

  /** Clears the refresh cookie: the same name, path and attributes, already expired. */
  clearRefreshCookie(response: Response): void {
    const attributes = [
      `${REFRESH_COOKIE}=`,
      "Max-Age=0",
      `Path=${REFRESH_COOKIE_PATH}`,
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      "HttpOnly",
      ...(this.config.get("cookieSecure") ? ["Secure"] : []),
      "SameSite=Lax",
    ];
    response.append("Set-Cookie", attributes.join("; "));
  }

  /** The refresh credential the request's `Cookie` header carries, or `null` when there is none. */
  readRefreshCookie(request: Request): string | null {
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
}
