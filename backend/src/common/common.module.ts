import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AppConfigService } from "../config/app-config.service";
import { PersistenceModule } from "../database/persistence.module";
import { AccessTokenGuard } from "./guards/access-token.guard";
import { AccessTokenService } from "./services/access-token.service";
import { AuthCookiesService } from "./services/auth-cookies.service";
import { PasswordHashService } from "./services/password-hash.service";

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
