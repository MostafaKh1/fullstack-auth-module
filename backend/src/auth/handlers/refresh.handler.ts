import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { ApiError } from "../../common/errors/api-error";
import { AppConfigService } from "../../config/app-config.service";
import { ClockService } from "../../core/clock.service";
import { SessionRepository } from "../../database/repositories/session.repository";
import { type User, UserRepository } from "../../database/repositories/user.repository";
import { AccessTokenService } from "../access-token.service";
import { isSessionLive, isWithinGrace, slidIdleExpiry } from "../session.rules";
import { DAY_MS, hashSecret, mintSecret, secretMatches } from "../session-issuer.service";

/**
 * What refresh answers. `rotated` carries the new refresh credential and the Session's idle expiry; it is `null`
 * when the immediately previous credential was accepted within the grace window, so the cookie set by the
 * rotation stays the current one.
 */
export type Refreshed = {
  user: User;
  accessToken: string;
  expiresIn: number;
  rotated: { refreshCredential: string; idleExpiresAt: Date } | null;
};

const CREDENTIAL = /^([0-9a-f]{24})\.([A-Za-z0-9_-]+)$/;

/**
 * Refresh (ADR 0001): a live Session's current refresh secret is replaced in one conditional update and the idle
 * expiry slides, never past the absolute cap. The immediately previous secret is accepted within the grace window;
 * any other secret is a replay and revokes the Session.
 */
@Injectable()
export class RefreshHandler {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly users: UserRepository,
    private readonly accessTokens: AccessTokenService,
    private readonly clock: ClockService,
    private readonly config: AppConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RefreshHandler.name);
  }

  async execute(credential: string | null): Promise<Refreshed> {
    if (!credential) throw new ApiError("auth.unauthenticated", { message: "No refresh cookie was sent." });
    const parsed = CREDENTIAL.exec(credential);
    if (!parsed) throw sessionExpired();
    const [, sessionId, secret] = parsed;

    const now = this.clock.now();
    const found = await this.sessions.findWithSecretHashesById(sessionId);
    if (!found || !isSessionLive(found.session, now)) throw sessionExpired();
    const { session } = found;

    if (secretMatches(secret, found.secretHash)) {
      const newSecret = mintSecret();
      const idleExpiresAt = slidIdleExpiry(
        now,
        this.config.get("sessionIdleTtlDays") * DAY_MS,
        session.absoluteExpiresAt,
      );
      const applied = await this.sessions.rotateSecret(sessionId, {
        expectedSecretHash: found.secretHash,
        newSecretHash: hashSecret(newSecret),
        replacedAt: now,
        idleExpiresAt,
      });
      if (applied) {
        return this.issue(session.userId, sessionId, now, {
          refreshCredential: `${sessionId}.${newSecret}`,
          idleExpiresAt,
        });
      }
      // A concurrent refresh rotated this secret first; it is now the previous one, judged below.
      return this.execute(credential);
    }

    const graceMs = this.config.get("refreshGraceSeconds") * 1000;
    if (
      secretMatches(secret, found.previousSecretHash) &&
      isWithinGrace(found.previousReplacedAt, now, graceMs)
    ) {
      return this.issue(session.userId, sessionId, now, null);
    }

    await this.sessions.revoke(sessionId, "reuse-detected", now);
    this.logger.warn({ userId: session.userId, sessionId }, "session.reuse_detected");
    throw sessionExpired();
  }

  private async issue(
    userId: string,
    sessionId: string,
    now: Date,
    rotated: Refreshed["rotated"],
  ): Promise<Refreshed> {
    const user = await this.users.findById(userId);
    if (!user) throw sessionExpired();
    return {
      user,
      accessToken: await this.accessTokens.sign({ userId, sessionId }, now),
      expiresIn: this.accessTokens.lifetimeSeconds,
      rotated,
    };
  }
}

function sessionExpired(): ApiError {
  return new ApiError("auth.session_expired", {
    message: "The refresh credential no longer holds a Session.",
  });
}
