import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { ClockService } from "../../core/clock.service";
import { SessionRepository } from "../../database/repositories/session.repository";
import { IS_PUBLIC } from "../decorators/auth.decorator";
import { ApiError } from "../errors/api-error";
import { AccessTokenService, type AuthContext } from "../services/access-token.service";

export type RequestWithAuthContext = Request & { authContext?: AuthContext };

type SessionExpiry = { revokedAt: Date | null; idleExpiresAt: Date; absoluteExpiresAt: Date };

const BEARER = /^Bearer ([A-Za-z0-9._-]+)$/;

export function isSessionLive(session: SessionExpiry, now: Date): boolean {
  return (
    session.revokedAt === null &&
    session.idleExpiresAt.getTime() > now.getTime() &&
    session.absoluteExpiresAt.getTime() > now.getTime()
  );
}

/** Deny by default. One read of the Session by primary key per request, so Sign out takes effect at once (ADR 0001). */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokenService: AccessTokenService,
    private readonly sessions: SessionRepository,
    private readonly clock: ClockService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithAuthContext>();
    const token = BEARER.exec(request.headers.authorization ?? "")?.[1];
    if (!token) throw new ApiError("auth.unauthenticated", { message: "A Bearer access token is required." });

    const now = this.clock.now();
    const auth = await this.accessTokenService.verify(token, now);
    if (!auth) {
      throw new ApiError("auth.unauthenticated", { message: "The access token is invalid or expired." });
    }
    const session = await this.sessions.findById(auth.sessionId);
    if (!session || session.userId !== auth.userId || !isSessionLive(session, now)) {
      throw new ApiError("auth.unauthenticated", { message: "The access token's Session has ended." });
    }

    request.authContext = auth;
    return true;
  }
}
