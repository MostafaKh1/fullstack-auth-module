import { Body, Controller, Headers, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { ApiErrors } from "@/common/decorators/api-errors.decorator";
import { Public } from "@/common/decorators/auth.decorator";
import { OriginCsrfGuard } from "@/common/guards/origin-csrf.guard";
import { RouteValidationPipe } from "@/common/pipes/route-validation.pipe";
import { AuthCookiesService } from "@/common/services/auth-cookies.service";
import { type AuthOutcome, AuthService } from "@/features/auth/services/auth.service";
import { type SignInBody, type SignUpBody, signInSchema, signUpSchema, type User } from "./auth.types";

export type AuthResponse = { accessToken: string; expiresIn: number; user: User };

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookies: AuthCookiesService,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @ApiBody({ schema: { $ref: "#/components/schemas/SignUpRequest" } })
  @ApiResponse({
    status: 201,
    description: "A new Session; the refresh cookie is set.",
    schema: { $ref: "#/components/schemas/SignedIn" },
  })
  @ApiErrors(
    "request.validation_failed",
    "request.malformed",
    "user.email_taken",
    "request.too_large",
    "request.rate_limited",
  )
  @Post("sign-up")
  async signUp(
    @Body(new RouteValidationPipe(signUpSchema)) body: SignUpBody,
    @Headers("user-agent") userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    return this.respond(response, await this.authService.signUp({ ...body, userAgent: userAgent ?? null }));
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
  @Post("sign-in")
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
  @Post("refresh")
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
  @Post("sign-out")
  @HttpCode(204)
  async signOut(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.authService.signOut(this.authCookies.readRefreshCookie(request));
    this.authCookies.clearRefreshCookie(response);
  }

  /** Within the grace window there is no new credential, so the cookie the rotation set is left in place (ADR 0001). */
  private respond(response: Response, signedIn: AuthOutcome): AuthResponse {
    if (signedIn.refreshCredential) this.authCookies.setRefreshCookie(response, signedIn.refreshCredential);
    return { accessToken: signedIn.accessToken, expiresIn: signedIn.expiresIn, user: signedIn.user };
  }
}
