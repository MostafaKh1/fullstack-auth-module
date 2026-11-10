import { Body, Controller, Headers, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { OriginGuard } from "../../auth/origin.guard";
import { Public } from "../../auth/public.decorator";
import { Clock } from "../../clock/clock";
import { AppConfigService } from "../../config/app-config.service";
import type { User } from "../../database/user.repository";
import { ZodBodyPipe } from "../../validation/zod-body.pipe";
import { type SignInBody, type SignUpBody, signInSchema, signUpSchema } from "./auth.schema";
import { RefreshHandler } from "./handlers/refresh.handler";
import { SignInHandler } from "./handlers/sign-in.handler";
import { type SignedIn, SignUpHandler } from "./handlers/sign-up.handler";
import { readRefreshCookie, setRefreshCookie } from "./refresh-cookie";

export type AuthResponse = { accessToken: string; expiresIn: number; user: User };

@Controller("auth")
export class AuthController {
  constructor(
    private readonly signUpHandler: SignUpHandler,
    private readonly signInHandler: SignInHandler,
    private readonly refreshHandler: RefreshHandler,
    private readonly clock: Clock,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Post("sign-up")
  async signUp(
    @Body(new ZodBodyPipe(signUpSchema)) body: SignUpBody,
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
    @Body(new ZodBodyPipe(signInSchema)) body: SignInBody,
    @Headers("user-agent") userAgent: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const signedIn = await this.signInHandler.execute({ ...body, userAgent: userAgent ?? null });
    return this.respond(response, signedIn);
  }

  /** Authenticated by the refresh cookie and the Origin check, not an access token. */
  @Public()
  @UseGuards(OriginGuard)
  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const refreshed = await this.refreshHandler.execute(readRefreshCookie(request));
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
    setRefreshCookie(response, credential, {
      maxAgeMs: idleExpiresAt.getTime() - this.clock.now().getTime(),
      secure: this.config.get("cookieSecure"),
    });
  }
}
