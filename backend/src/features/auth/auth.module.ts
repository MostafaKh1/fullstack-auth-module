import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { CommonModule } from "@/common/common.module.js";
import { AppConfigService } from "@/config/app-config.service.js";
import { PersistenceModule } from "@/database/persistence.module.js";
import { AuthService } from "@/features/auth/services/auth.service.js";
import { AuthCookiesService } from "@/features/auth/services/auth-cookies.service.js";
import { PasswordHashService } from "@/features/auth/services/password-hash.service.js";
import { SessionService } from "@/features/auth/services/session.service.js";
import { AuthController } from "./auth.controller.js";

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
