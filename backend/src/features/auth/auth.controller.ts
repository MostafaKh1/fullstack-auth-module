import { Body, Controller, Headers, HttpCode, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { Public } from "../../auth/public.decorator";
import { Clock } from "../../clock/clock";
import { AppConfigService } from "../../config/app-config.service";
import type { User } from "../../database/user.repository";
import { ZodBodyPipe } from "../../validation/zod-body.pipe";
import { type SignInBody, type SignUpBody, signInSchema, signUpSchema } from "./auth.schema";
import { SignInHandler } from "./handlers/sign-in.handler";
import { type SignedIn, SignUpHandler } from "./handlers/sign-up.handler";
import { setRefreshCookie } from "./refresh-cookie";

export type AuthResponse = { accessToken: string; expiresIn: number; user: User };

@Controller("auth")
export class AuthController {
  constructor(
    private readonly signUpHandler: SignUpHandler,
    private readonly signInHandler: SignInHandler,
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

  private respond(response: Response, signedIn: SignedIn): AuthResponse {
    setRefreshCookie(response, signedIn.refreshCredential, {
      maxAgeMs: signedIn.idleExpiresAt.getTime() - this.clock.now().getTime(),
      secure: this.config.get("cookieSecure"),
    });
    return { accessToken: signedIn.accessToken, expiresIn: signedIn.expiresIn, user: signedIn.user };
  }
}
