import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AuthCookiesService } from "../common/auth-cookies.service";
import { AppConfigService } from "../config/app-config.service";
import { PersistenceModule } from "../database/persistence.module";
import { AccessTokenGuard } from "./access-token.guard";
import { AccessTokenService } from "./access-token.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PasswordHashService } from "./password-hash.service";
import { SessionService } from "./session.service";

/**
 * Authentication: the routes (Sign up, Sign in, refresh), `AuthService` behind them, and the services under it:
 * the password hasher, the access token, the Session lifecycle, the refresh cookie, and the global guard.
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
    AuthService,
    SessionService,
    PasswordHashService,
    AccessTokenService,
    AuthCookiesService,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
  exports: [PasswordHashService, AccessTokenService, SessionService],
})
export class AuthModule {}
