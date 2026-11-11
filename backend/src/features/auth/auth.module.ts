import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { CommonModule } from "@/common/common.module";
import { AppConfigService } from "@/config/app-config.service";
import { PersistenceModule } from "@/database/persistence.module";
import { AuthService } from "@/features/auth/services/auth.service";
import { AuthCookiesService } from "@/features/auth/services/auth-cookies.service";
import { PasswordHashService } from "@/features/auth/services/password-hash.service";
import { SessionService } from "@/features/auth/services/session.service";
import { AuthController } from "./auth.controller";

@Module({
  imports: [
    PersistenceModule,
    CommonModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [{ limit: config.get("throttleLimit"), ttl: config.get("throttleTtlSeconds") * 1000 }],
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionService, PasswordHashService, AuthCookiesService],
})
export class AuthModule {}
