import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AuthCookiesService } from "../common/auth-cookies.service";
import { AppConfigService } from "../config/app-config.service";
import { PersistenceModule } from "../database/persistence.module";
import { AccessTokenGuard } from "./access-token.guard";
import { AccessTokenService } from "./access-token.service";
import { AuthController } from "./auth.controller";
import { RefreshHandler } from "./handlers/refresh.handler";
import { SignInHandler } from "./handlers/sign-in.handler";
import { SignUpHandler } from "./handlers/sign-up.handler";
import { PasswordHashService } from "./password-hash.service";
import { SessionIssuerService } from "./session-issuer.service";

/**
 * Authentication: the routes (Sign up, Sign in, refresh) and their handlers, and the infrastructure under them:
 * the password hasher, the access token, Session issuing, the refresh cookie, and the global guard.
 */
@Module({
  imports: [
    PersistenceModule,
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.get("jwtAccessSecret"),
        signOptions: { algorithm: "HS256" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    PasswordHashService,
    AccessTokenService,
    SessionIssuerService,
    AuthCookiesService,
    SignUpHandler,
    SignInHandler,
    RefreshHandler,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
  exports: [PasswordHashService, AccessTokenService, SessionIssuerService],
})
export class AuthModule {}
