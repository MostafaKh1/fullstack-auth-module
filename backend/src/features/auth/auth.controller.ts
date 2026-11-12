import { contract } from "@app/contract";
import { type SignInBody, signInSchema } from "@app/contract/field-rules";
import { Body, Controller, Headers, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";
import { Implement, implement } from "@orpc/nest";
import type { Request, Response } from "express";
import { ApiErrors } from "@/common/decorators/api-errors.decorator.js";
import { Public } from "@/common/decorators/auth.decorator.js";
import type { User } from "@/common/types/user.types.js";
import { type AuthOutcome, AuthService } from "@/features/auth/services/auth.service.js";
import { AuthCookiesService } from "@/features/auth/services/auth-cookies.service.js";
import { OriginCsrfGuard } from "./origin-csrf.guard.js";
import { RouteValidationPipe } from "./route-validation.pipe.js";

type AuthResponse = { accessToken: string; expiresIn: number; user: User };

// No controller path: a contract procedure carries its whole path (`/auth/sign-up`).
@ApiTags("auth")
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
      const userAgent = context.request.headers["user-agent"] ?? null;
      return this.respond(context.resHeaders, await this.authService.signUp({ ...input, userAgent }));
    });
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @ApiBody({ schema: { $ref: "#/components/schemas/SignInRequest" } })
  @ApiResponse({
    status: 200,
    description: "A new Session; the refresh cookie is set.",
    schema: { $ref: "#/components/schemas/SignedIn" },
  })
  @ApiErrors(
    "request.validation_failed",
    "request.malformed",
    "auth.invalid_credentials",
    "request.too_large",
    "request.rate_limited",
  )
  @Post("auth/sign-in")
  @HttpCode(200)
  async signIn(
    @Body(new RouteValidationPipe(signInSchema)) body: SignInBody,
    @Headers("user-agent") userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    return this.respond(response, await this.authService.signIn({ ...body, userAgent: userAgent ?? null }));
  }

  /** The refresh cookie and the Origin check stand in for an access token; throttled against secret guessing. */
  @Public()
  @UseGuards(ThrottlerGuard, OriginCsrfGuard)
  @ApiCookieAuth()
  @ApiResponse({
    status: 200,
    description: "A rotated Session; the refresh cookie is replaced.",
    schema: { $ref: "#/components/schemas/SignedIn" },
  })
  @ApiErrors("auth.unauthenticated", "auth.session_expired", "auth.origin_rejected", "request.rate_limited")
  @Post("auth/refresh")
  @HttpCode(200)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const signedIn = await this.authService.refresh(this.authCookies.readRefreshCookie(request));
    return this.respond(response, signedIn);
  }

  /** Idempotent: the cookie is cleared whether or not it held a live Session, unless it was sent twice (ADR 0001). */
  @Public()
  @UseGuards(OriginCsrfGuard)
  @ApiCookieAuth()
  @ApiResponse({ status: 204, description: "The Session ended and the refresh cookie is cleared." })
  @ApiErrors("auth.unauthenticated", "auth.origin_rejected")
  @Post("auth/sign-out")
  @HttpCode(204)
  async signOut(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.authService.signOut(this.authCookies.readRefreshCookie(request));
    this.authCookies.clearRefreshCookie(response);
  }

  /** Within the grace window there is no new credential, so the cookie the rotation set is left in place (ADR 0001). */
  private respond(response: Response | Headers, signedIn: AuthOutcome): AuthResponse {
    if (signedIn.refreshCredential) this.authCookies.setRefreshCookie(response, signedIn.refreshCredential);
    return { accessToken: signedIn.accessToken, expiresIn: signedIn.expiresIn, user: signedIn.user };
  }
}
