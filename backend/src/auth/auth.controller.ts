import { Body, Controller, Headers, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { Public } from "../common/auth.decorator";
import { AuthCookiesService } from "../common/auth-cookies.service";
import { OriginCsrfGuard } from "../common/origin-csrf.guard";
import { RouteValidationPipe } from "../common/route-validation.pipe";
import { AppConfigService } from "../config/app-config.service";
import { ClockService } from "../core/clock.service";
import type { User } from "../database/repositories/user.repository";
import { type SignInBody, type SignUpBody, signInSchema, signUpSchema } from "./auth.types";
import { RefreshHandler } from "./handlers/refresh.handler";
import { SignInHandler } from "./handlers/sign-in.handler";
import { type SignedIn, SignUpHandler } from "./handlers/sign-up.handler";

export type AuthResponse = { accessToken: string; expiresIn: number; user: User };

@Controller("auth")
export class AuthController {
  constructor(
    private readonly signUpHandler: SignUpHandler,
    private readonly signInHandler: SignInHandler,
    private readonly refreshHandler: RefreshHandler,
    private readonly clock: ClockService,
    private readonly config: AppConfigService,
    private readonly authCookies: AuthCookiesService,
  ) {}

  @Public()
  @Post("sign-up")
  async signUp(
    @Body(new RouteValidationPipe(signUpSchema)) body: SignUpBody,
    @Headers("user-agent") userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const signedIn = await this.signUpHandler.execute({ ...body, userAgent: userAgent ?? null });
    return this.respond(response, signedIn);
  }

  @Public()
  @Post("sign-in")
  @HttpCode(200)
  async signIn(
    @Body(new RouteValidationPipe(signInSchema)) body: SignInBody,
    @Headers("user-agent") userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const signedIn = await this.signInHandler.execute({ ...body, userAgent: userAgent ?? null });
    return this.respond(response, signedIn);
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
    const refreshed = await this.refreshHandler.execute(this.authCookies.readRefreshCookie(request));
    // Within the grace window nothing was rotated, so the cookie the rotation set is left in place.
    if (refreshed.rotated)
      this.setCookie(response, refreshed.rotated.refreshCredential, refreshed.rotated.idleExpiresAt);
    return { accessToken: refreshed.accessToken, expiresIn: refreshed.expiresIn, user: refreshed.user };
  }

  private respond(response: Response, signedIn: SignedIn): AuthResponse {
    this.setCookie(response, signedIn.refreshCredential, signedIn.idleExpiresAt);
    return { accessToken: signedIn.accessToken, expiresIn: signedIn.expiresIn, user: signedIn.user };
  }

  private setCookie(response: Response, credential: string, idleExpiresAt: Date): void {
    this.authCookies.setRefreshCookie(response, credential, {
      maxAgeMs: idleExpiresAt.getTime() - this.clock.now().getTime(),
      secure: this.config.get("cookieSecure"),
    });
  }
}
