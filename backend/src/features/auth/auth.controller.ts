import { contract } from "@app/contract";
import type { SignedInResponse } from "@app/contract/auth/auth.contract";
import { Controller, Res, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { Implement, implement } from "@orpc/nest";
import type { Request, Response } from "express";
import { Public } from "@/common/decorators/auth.decorator.js";
import { type AuthOutcome, AuthService } from "@/features/auth/services/auth.service.js";
import { AuthCookiesService } from "@/features/auth/services/auth-cookies.service.js";
import { OriginCsrfGuard } from "./origin-csrf.guard.js";

const userAgentOf = (request: Request): string | null => request.headers["user-agent"] ?? null;

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookies: AuthCookiesService,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Implement(contract.auth.signUp)
  signUp() {
    return implement(contract.auth.signUp).handler(async ({ input, context }) => {
      const signedIn = await this.authService.signUp({ ...input, userAgent: userAgentOf(context.request) });
      return this.respond(context.resHeaders, signedIn);
    });
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Implement(contract.auth.signIn)
  signIn() {
    return implement(contract.auth.signIn).handler(async ({ input, context }) => {
      const signedIn = await this.authService.signIn({ ...input, userAgent: userAgentOf(context.request) });
      return this.respond(context.resHeaders, signedIn);
    });
  }

  /** The refresh cookie and the Origin check stand in for an access token; throttled against secret guessing. */
  @Public()
  @UseGuards(ThrottlerGuard, OriginCsrfGuard)
  @Implement(contract.auth.refresh)
  refresh() {
    return implement(contract.auth.refresh).handler(async ({ context }) => {
      const signedIn = await this.authService.refresh(this.authCookies.readRefreshCookie(context.request));
      return this.respond(context.resHeaders, signedIn);
    });
  }

  /** Idempotent: the cookie is cleared whether or not it held a live Session, unless it was sent twice (ADR 0001). */
  @Public()
  @UseGuards(OriginCsrfGuard)
  @Implement(contract.auth.signOut)
  // oRPC has sent the 204 by the time Nest would reply; Nest replying again makes Express strip the headers of a sent
  // response and throw. `@Res()` tells Nest the response is handled.
  signOut(@Res() _response: Response) {
    return implement(contract.auth.signOut).handler(async ({ context }) => {
      await this.authService.signOut(this.authCookies.readRefreshCookie(context.request));
      this.authCookies.clearRefreshCookie(context.resHeaders);
    });
  }

  /** Within the grace window there is no new credential, so the cookie the rotation set is left in place (ADR 0001). */
  private respond(headers: Headers, signedIn: AuthOutcome): SignedInResponse {
    if (signedIn.refreshCredential) this.authCookies.setRefreshCookie(headers, signedIn.refreshCredential);
    return { accessToken: signedIn.accessToken, expiresIn: signedIn.expiresIn, user: signedIn.user };
  }
}
