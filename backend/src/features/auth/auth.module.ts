import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { CommonModule } from "../../common/common.module";
import { AppConfigService } from "../../config/app-config.service";
import { PersistenceModule } from "../../database/persistence.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./services/auth.service";
import { SessionService } from "./services/session.service";

/** Authentication: the routes (Sign up, Sign in, refresh, Sign out), `AuthService` behind them, and the Session lifecycle. */
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
  providers: [AuthService, SessionService],
})
export class AuthModule {}
