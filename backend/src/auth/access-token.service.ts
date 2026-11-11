import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AppConfigService } from "../config/app-config.service";
import type { AccessClaims } from "./auth.types";

type Payload = { sub: string; sid: string; iat: number; exp: number };

/** Issues and checks the short-lived HS256 access token (ADR 0001); its times come from the caller's clock. */
@Injectable()
export class AccessTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  get lifetimeSeconds(): number {
    return this.config.get("accessTokenTtlSeconds");
  }

  sign(claims: AccessClaims, now: Date): Promise<string> {
    const iat = Math.floor(now.getTime() / 1000);
    const payload: Payload = {
      sub: claims.userId,
      sid: claims.sessionId,
      iat,
      exp: iat + this.lifetimeSeconds,
    };
    return this.jwt.signAsync(payload);
  }

  /** The token's claims, or `null` when it is malformed, forged or expired at `now`. */
  async verify(token: string, now: Date): Promise<AccessClaims | null> {
    try {
      const payload = await this.jwt.verifyAsync<Payload>(token, {
        algorithms: ["HS256"],
        clockTimestamp: Math.floor(now.getTime() / 1000),
      });
      if (typeof payload.sub !== "string" || typeof payload.sid !== "string") return null;
      return { userId: payload.sub, sessionId: payload.sid };
    } catch {
      return null;
    }
  }
}
