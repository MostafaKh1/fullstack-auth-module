import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { ApiError } from "@/common/errors/api-error";
import { isSessionLive } from "@/common/guards/access-token.guard";
import type { AuthContext } from "@/common/services/access-token.service";
import { AppConfigService } from "@/config/app-config.service";
import { ClockService } from "@/core/clock.service";
import { SessionRepository } from "@/database/repositories/session.repository";
import type { RevokedReason } from "@/features/auth/auth.types";
import {
  mintRefreshCredential,
  parseRefreshCredential,
  type RefreshCredential,
  secretMatches,
} from "@/features/auth/refresh-credential";

const DAY_MS = 24 * 60 * 60 * 1000;

export type IssuedRefreshCredential = { value: string; idleExpiresAt: Date };

export type StartedSession = { claims: AuthContext; issued: IssuedRefreshCredential };

/** `issued` is `null` within the grace window: the credential the rotation issued stays current (ADR 0001). */
export type RefreshedSession = { claims: AuthContext; issued: IssuedRefreshCredential | null };

/** The Session lifecycle (ADR 0001). Liveness is the guard's rule (`isSessionLive`), applied here too. */
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

  async refresh(presented: string | null): Promise<RefreshedSession> {
    if (!presented) throw new ApiError("auth.unauthenticated", { message: "No refresh cookie was sent." });
    const credential = parseRefreshCredential(presented);
    if (!credential) throw sessionExpired();
    return this.rotate(credential);
  }

  private async revoke(sessionId: string, reason: RevokedReason): Promise<void> {
    await this.sessions.revoke(sessionId, reason, this.clock.now());
  }

  /** Idempotent; a Session id alone ends nothing, the secret must match. */
  async revokeForCredential(presented: string | null): Promise<void> {
    const credential = presented ? parseRefreshCredential(presented) : null;
    if (!credential) return;
    const found = await this.sessions.findWithSecretHashesById(credential.sessionId);
    if (!found) return;
    // A Sign out racing a refresh carries the secret that refresh replaced, and must still end the Session (ADR 0001).
    const justReplaced =
      secretMatches(credential, found.previousSecretHash) && this.isWithinGrace(found, this.clock.now());
    if (!secretMatches(credential, found.secretHash) && !justReplaced) return;
    await this.revoke(credential.sessionId, "sign-out");
    this.logger.info({ userId: found.session.userId, sessionId: credential.sessionId }, "session.signed_out");
  }

  /** Two tabs refreshing together must not read as replay (ADR 0001). */
  private isWithinGrace({ previousReplacedAt }: { previousReplacedAt: Date | null }, now: Date): boolean {
    const graceMs = this.config.get("refreshGraceSeconds") * 1000;
    return previousReplacedAt !== null && now.getTime() - previousReplacedAt.getTime() <= graceMs;
  }

  private async rotate(credential: RefreshCredential): Promise<RefreshedSession> {
    const { sessionId } = credential;
    const now = this.clock.now();
    const found = await this.sessions.findWithSecretHashesById(sessionId);
    if (!found || !isSessionLive(found.session, now)) throw sessionExpired();
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

    // Any other secret proves nothing (the Session id is readable from the access token), so it changes nothing (ADR 0001).
    if (!secretMatches(credential, found.previousSecretHash)) throw sessionExpired();

    if (this.isWithinGrace(found, now)) return { claims, issued: null };

    // A replaced secret replayed after the grace window: only a holder of a real credential has it, and the
    // credential has been used twice, so one of the two holders is a thief and the Session ends (ADR 0001).
    await this.revoke(sessionId, "reuse-detected");
    this.logger.warn(claims, "session.reuse_detected");
    throw sessionExpired();
  }
}

function slidIdleExpiry(now: Date, idleTtlMs: number, absoluteExpiresAt: Date): Date {
  return new Date(Math.min(now.getTime() + idleTtlMs, absoluteExpiresAt.getTime()));
}

function sessionExpired(): ApiError {
  return new ApiError("auth.session_expired", {
    message: "The refresh credential no longer holds a Session.",
  });
}
