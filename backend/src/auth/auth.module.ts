import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AppConfigService } from "../config/app-config.service";
import { DatabaseModule } from "../database/database.module";
import { AccessTokenGuard } from "./access-token.guard";
import { AccessTokenService } from "./access-token.service";
import { PasswordHashService } from "./password-hash.service";
import { SessionIssuerService } from "./session-issuer.service";

/** Authentication infrastructure: the password hasher, the access token, Session issuing, and the global guard. */
@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.get("jwtAccessSecret"),
        signOptions: { algorithm: "HS256" },
      }),
    }),
  ],
  providers: [
    PasswordHashService,
    AccessTokenService,
    SessionIssuerService,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
  exports: [PasswordHashService, AccessTokenService, SessionIssuerService],
})
export class AuthModule {}
