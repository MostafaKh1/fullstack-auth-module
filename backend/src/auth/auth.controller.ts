import { Body, Controller, Headers, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { Public } from "../common/auth.decorator";
import { AuthCookiesService } from "../common/auth-cookies.service";
import { OriginCsrfGuard } from "../common/origin-csrf.guard";
import { RouteValidationPipe } from "../common/route-validation.pipe";
import { AuthService, type SignedIn } from "./auth.service";
import { type SignInBody, type SignUpBody, signInSchema, signUpSchema, type User } from "./auth.types";

export type AuthResponse = { accessToken: string; expiresIn: number; user: User };

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookies: AuthCookiesService,
  ) {}

  @Public()
  @Post("sign-up")
  async signUp(
    @Body(new RouteValidationPipe(signUpSchema)) body: SignUpBody,
    @Headers("user-agent") userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    return this.respond(response, await this.authService.signUp({ ...body, userAgent: userAgent ?? null }));
  }

  @Public()
  @Post("sign-in")
  @HttpCode(200)
  async signIn(
    @Body(new RouteValidationPipe(signInSchema)) body: SignInBody,
    @Headers("user-agent") userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    return this.respond(response, await this.authService.signIn({ ...body, userAgent: userAgent ?? null }));
  }

  /** Authenticated by the refresh cookie and the Origin check, not an access token. */
  @Public()
  @UseGuards(OriginCsrfGuard)
  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const signedIn = await this.authService.refresh(this.authCookies.readRefreshCookie(request));
    return this.respond(response, signedIn);
  }

  /** Idempotent: the cookie is cleared whether or not it held a live Session. */
  @Public()
  @UseGuards(OriginCsrfGuard)
  @Post("sign-out")
  @HttpCode(204)
  async signOut(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.authService.signOut(this.authCookies.readRefreshCookie(request));
    this.authCookies.clearRefreshCookie(response);
  }

  /** Within the grace window there is no new credential, so the cookie the rotation set is left in place. */
  private respond(response: Response, signedIn: SignedIn): AuthResponse {
    if (signedIn.refreshCredential) {
      const { value, idleExpiresAt } = signedIn.refreshCredential;
      this.authCookies.setRefreshCookie(response, value, idleExpiresAt);
    }
    return { accessToken: signedIn.accessToken, expiresIn: signedIn.expiresIn, user: signedIn.user };
  }
}
