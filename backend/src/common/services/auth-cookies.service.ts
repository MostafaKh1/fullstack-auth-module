import { Injectable } from "@nestjs/common";
import type { Request, Response } from "express";
import { ApiError } from "@/common/errors/api-error";
import { AppConfigService } from "@/config/app-config.service";
import { ClockService } from "@/core/clock.service";

export const REFRESH_COOKIE = "refresh_credential";

// The cookie travels only to the auth routes, never to the rest of the API (ADR 0001).
const REFRESH_COOKIE_PATH = "/api/auth";

@Injectable()
export class AuthCookiesService {
  constructor(
    private readonly config: AppConfigService,
    private readonly clock: ClockService,
  ) {}

  setRefreshCookie(response: Response, credential: { value: string; idleExpiresAt: Date }): void {
    const { value, idleExpiresAt } = credential;
    const maxAgeSeconds = Math.floor((idleExpiresAt.getTime() - this.clock.now().getTime()) / 1000);
    this.writeRefreshCookie(response, encodeURIComponent(value), maxAgeSeconds, idleExpiresAt);
  }

  clearRefreshCookie(response: Response): void {
    this.writeRefreshCookie(response, "", 0, new Date(0));
  }

  readRefreshCookie(request: Request): string | null {
    const values = (request.headers.cookie ?? "").split(";").flatMap((pair) => {
      const separator = pair.indexOf("=");
      if (separator === -1 || pair.slice(0, separator).trim() !== REFRESH_COOKIE) return [];
      return [pair.slice(separator + 1).trim()];
    });
    // A site on a shared parent domain can plant a second one with a more specific path, which the browser sends
    // first, and nothing in the header tells ours apart from it (ADR 0001).
    if (values.length > 1) {
      throw new ApiError("auth.unauthenticated", { message: "More than one refresh cookie was sent." });
    }
    if (values.length === 0) return null;
    try {
      return decodeURIComponent(values[0]);
    } catch {
      return null;
    }
  }

  // Written by hand: Express's `res.cookie` derives `Expires` from the real clock, not from the Session.
  private writeRefreshCookie(response: Response, value: string, maxAgeSeconds: number, expires: Date): void {
    const attributes = [
      `${REFRESH_COOKIE}=${value}`,
      `Max-Age=${maxAgeSeconds}`,
      `Path=${REFRESH_COOKIE_PATH}`,
      `Expires=${expires.toUTCString()}`,
      "HttpOnly",
      ...(this.config.get("cookieSecure") ? ["Secure"] : []),
      "SameSite=Lax",
    ];
    response.append("Set-Cookie", attributes.join("; "));
  }
}
