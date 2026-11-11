import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AccessTokenGuard } from "@/common/guards/access-token.guard";
import { AccessTokenService } from "@/common/services/access-token.service";
import { AuthCookiesService } from "@/common/services/auth-cookies.service";
import { PasswordHashService } from "@/common/services/password-hash.service";
import { AppConfigService } from "@/config/app-config.service";
import { PersistenceModule } from "@/database/persistence.module";

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
