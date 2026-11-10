import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { Clock } from "../clock/clock";
import { SessionRepository } from "../database/session.repository";
import { ApiError } from "../errors/api-error";
import { type AccessClaims, AccessTokenService } from "./access-token.service";
import { IS_PUBLIC } from "./public.decorator";
import { isSessionLive } from "./session.rules";

export type AuthenticatedRequest = Request & { authSession?: AccessClaims };

const BEARER = /^Bearer ([A-Za-z0-9._-]+)$/;

/**
 * The global guard: deny by default. A route needs a valid access token whose Session is still live,
 * one read by primary key per request, so Sign out takes effect at once (ADR 0001). `@Public()` opts a route out.
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokens: AccessTokenService,
    private readonly sessions: SessionRepository,
    private readonly clock: Clock,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = BEARER.exec(request.headers.authorization ?? "")?.[1];
    if (!token) throw new ApiError("auth.unauthenticated", { message: "A Bearer access token is required." });

    const now = this.clock.now();
    const claims = await this.accessTokens.verify(token, now);
    if (!claims) {
      throw new ApiError("auth.unauthenticated", { message: "The access token is invalid or expired." });
    }
    const session = await this.sessions.findById(claims.sessionId);
    if (!session || session.userId !== claims.userId || !isSessionLive(session, now)) {
      throw new ApiError("auth.unauthenticated", { message: "The access token's Session has ended." });
    }

    request.authSession = claims;
    return true;
  }
}
