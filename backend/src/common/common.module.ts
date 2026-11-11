import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AppConfigService } from "../config/app-config.service";
import { PersistenceModule } from "../database/persistence.module";
import { AccessTokenGuard } from "./guards/access-token.guard";
import { AccessTokenService } from "./services/access-token.service";
import { AuthCookiesService } from "./services/auth-cookies.service";
import { PasswordHashService } from "./services/password-hash.service";

/**
 * What the global guard and more than one feature share: the access token, the password hasher, the refresh
 * cookie, and the global deny-by-default guard. A feature module imports it to inject the services.
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
  providers: [
    AccessTokenService,
    PasswordHashService,
    AuthCookiesService,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
  exports: [AccessTokenService, PasswordHashService, AuthCookiesService],
})
export class CommonModule {}
