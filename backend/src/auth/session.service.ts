import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { ApiError } from "../common/errors/api-error";
import { AppConfigService } from "../config/app-config.service";
import { ClockService } from "../core/clock.service";
import { SessionRepository } from "../database/repositories/session.repository";
import type { AccessClaims, RevokedReason, Session } from "./auth.types";
import {
  mintRefreshCredential,
  parseRefreshCredential,
  type RefreshCredential,
  secretMatches,
} from "./refresh-credential";

const DAY_MS = 24 * 60 * 60 * 1000;

/** A refresh credential just issued: `value` (`<sessionId>.<secret>`) is valid until the Session's idle expiry. */
export type IssuedRefreshCredential = { value: string; idleExpiresAt: Date };

/** A Session just started: whose it is, and its first refresh credential. */
export type StartedSession = { claims: AccessClaims; issued: IssuedRefreshCredential };

/**
 * What a refresh established: whose Session it is, and the new credential. `issued` is `null` when the immediately
 * previous credential was accepted within the grace window, so the credential the rotation issued stays current.
 */
export type RefreshedSession = { claims: AccessClaims; issued: IssuedRefreshCredential | null };

/**
 * The Session's lifecycle (ADR 0001): starting one, rotating its refresh credential, revoking it, and the rules of
 * liveness, the sliding idle expiry and the grace window.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly clock: ClockService,
    private readonly config: AppConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(SessionService.name);
  }

  /** Starts a new Session for a User, storing only its secret's hash. */
  async start(userId: string, userAgent: string | null): Promise<StartedSession> {
    const now = this.clock.now();
    const sessionId = this.sessions.newId();
    const credential = mintRefreshCredential(sessionId);
    const idleExpiresAt = new Date(now.getTime() + this.config.get("sessionIdleTtlDays") * DAY_MS);
    await this.sessions.create({
      id: sessionId,
      userId,
      secretHash: credential.secretHash,
      idleExpiresAt,
      absoluteExpiresAt: new Date(now.getTime() + this.config.get("sessionAbsoluteTtlDays") * DAY_MS),
      userAgent,
      createdAt: now,
    });
    this.logger.info({ userId, sessionId }, "session.started");
    return { claims: { userId, sessionId }, issued: { value: credential.value, idleExpiresAt } };
  }

  /** Whether the access token's Session still exists, belongs to its User, and is live. */
  async isLive(claims: AccessClaims): Promise<boolean> {
    const session = await this.sessions.findById(claims.sessionId);
    return session !== null && session.userId === claims.userId && isLive(session, this.clock.now());
  }

  /**
   * Refresh: a live Session's current secret is replaced in one conditional update and the idle expiry slides,
   * never past the absolute cap. The immediately previous secret is accepted within the grace window; any other
   * secret is a replay and revokes the Session.
   */
  async refresh(presented: string | null): Promise<RefreshedSession> {
    if (!presented) throw new ApiError("auth.unauthenticated", { message: "No refresh cookie was sent." });
    const credential = parseRefreshCredential(presented);
    if (!credential) throw sessionExpired();
    return this.rotate(credential);
  }

  /** Revokes the Session; a Session already revoked keeps its first revocation. */
  async revoke(sessionId: string, reason: RevokedReason): Promise<void> {
    await this.sessions.revoke(sessionId, reason, this.clock.now());
  }

  private async rotate(credential: RefreshCredential): Promise<RefreshedSession> {
    const { sessionId } = credential;
    const now = this.clock.now();
    const found = await this.sessions.findWithSecretHashesById(sessionId);
    if (!found || !isLive(found.session, now)) throw sessionExpired();
    const claims = { userId: found.session.userId, sessionId };

    if (secretMatches(credential, found.secretHash)) {
      const next = mintRefreshCredential(sessionId);
      const idleExpiresAt = slidIdleExpiry(
        now,
        this.config.get("sessionIdleTtlDays") * DAY_MS,
        found.session.absoluteExpiresAt,
      );
      const applied = await this.sessions.rotateSecret(sessionId, {
        expectedSecretHash: found.secretHash,
        newSecretHash: next.secretHash,
        replacedAt: now,
        idleExpiresAt,
      });
      if (applied) return { claims, issued: { value: next.value, idleExpiresAt } };
      // A concurrent refresh rotated this secret first; it is now the previous one, judged on the next pass.
      return this.rotate(credential);
    }

    const graceMs = this.config.get("refreshGraceSeconds") * 1000;
    if (
      secretMatches(credential, found.previousSecretHash) &&
      isWithinGrace(found.previousReplacedAt, now, graceMs)
    ) {
      return { claims, issued: null };
    }

    // A known Session presented with a wrong secret: a stolen credential may be in use, so the Session ends (ADR 0001).
    await this.revoke(sessionId, "reuse-detected");
    this.logger.warn(claims, "session.reuse_detected");
    throw sessionExpired();
  }
}

/** A Session is live while it is not revoked and has passed neither its idle nor its absolute expiry. */
function isLive(session: Session, now: Date): boolean {
  return (
    session.revokedAt === null &&
    session.idleExpiresAt.getTime() > now.getTime() &&
    session.absoluteExpiresAt.getTime() > now.getTime()
  );
}

/** The idle expiry a refresh at `now` gives: `idleTtlMs` ahead, but never past the absolute expiry. */
function slidIdleExpiry(now: Date, idleTtlMs: number, absoluteExpiresAt: Date): Date {
  return new Date(Math.min(now.getTime() + idleTtlMs, absoluteExpiresAt.getTime()));
}

/** Whether a secret replaced at `replacedAt` is still accepted at `now`, so two tabs refreshing together are not replay. */
function isWithinGrace(replacedAt: Date | null, now: Date, graceMs: number): boolean {
  return replacedAt !== null && now.getTime() - replacedAt.getTime() <= graceMs;
}

function sessionExpired(): ApiError {
  return new ApiError("auth.session_expired", {
    message: "The refresh credential no longer holds a Session.",
  });
}
