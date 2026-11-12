import { type DynamicModule, Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { CommonModule } from "@/common/common.module.js";
import { AllExceptionsFilter } from "@/common/filters/all-exceptions.filter.js";
import { AppConfigModule } from "@/config/app-config.module.js";
import type { AppConfig } from "@/config/app-env.js";
import { CoreModule } from "@/core/core.module.js";
import { PersistenceModule } from "@/database/persistence.module.js";
import { AuthModule } from "@/features/auth/auth.module.js";
import { HealthModule } from "@/features/health/health.module.js";
import { UsersModule } from "@/features/users/users.module.js";
import { LoggingModule, type LoggingOptions } from "@/logging/logging.module.js";

@Module({})
export class AppModule {
  static forRoot(config: AppConfig, logging: LoggingOptions = {}): DynamicModule {
    return {
      module: AppModule,
      imports: [
        AppConfigModule.forRoot(config),
        LoggingModule.forRoot(logging),
        CoreModule,
        PersistenceModule,
        CommonModule,
        AuthModule,
        UsersModule,
        HealthModule,
      ],
      providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
    };
  }
}
