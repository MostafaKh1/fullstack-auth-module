import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { Clock } from "../clock/clock";
import { AppConfigService } from "../config/app-config.service";
import { SessionRepository } from "../database/session.repository";
import { AccessTokenService } from "./access-token.service";

export const DAY_MS = 24 * 60 * 60 * 1000;

/** The credentials of a freshly started Session. `refreshCredential` is `<sessionId>.<secret>` and goes only in the cookie. */
export type StartedSession = {
  accessToken: string;
  expiresIn: number;
  refreshCredential: string;
  idleExpiresAt: Date;
};

/** Starts a new Session for a User: stores it with only its secret's hash, and issues both credentials. */
@Injectable()
export class SessionIssuerService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly accessTokens: AccessTokenService,
    private readonly clock: Clock,
    private readonly config: AppConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(SessionIssuerService.name);
  }

  async start(userId: string, userAgent: string | null): Promise<StartedSession> {
    const now = this.clock.now();
    const sessionId = this.sessions.newId();
    const secret = mintSecret();
    const idleExpiresAt = new Date(now.getTime() + this.config.get("sessionIdleTtlDays") * DAY_MS);
    await this.sessions.create({
      id: sessionId,
      userId,
      secretHash: hashSecret(secret),
      idleExpiresAt,
      absoluteExpiresAt: new Date(now.getTime() + this.config.get("sessionAbsoluteTtlDays") * DAY_MS),
      userAgent,
      createdAt: now,
    });
    this.logger.info({ userId, sessionId }, "session.started");
    return {
      accessToken: await this.accessTokens.sign({ userId, sessionId }, now),
      expiresIn: this.accessTokens.lifetimeSeconds,
      refreshCredential: `${sessionId}.${secret}`,
      idleExpiresAt,
    };
  }
}

/** Only this hash of a refresh secret is ever stored (ADR 0001). */
export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/** A new refresh secret: 32 random bytes. */
export function mintSecret(): string {
  return randomBytes(32).toString("base64url");
}

/** Whether `secret` hashes to `storedHash`, compared in constant time. */
export function secretMatches(secret: string, storedHash: string | null): boolean {
  if (storedHash === null) return false;
  const actual = Buffer.from(hashSecret(secret), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
