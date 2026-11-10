import { type DynamicModule, Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";
import { AppConfigModule } from "./config/app-config.module";
import type { AppConfig } from "./config/app-env";
import { CoreModule } from "./core/core.module";
import { PersistenceModule } from "./database/persistence.module";
import { UsersModule } from "./features/users/users.module";
import { HealthModule } from "./health/health.module";
import { LoggingModule, type LoggingOptions } from "./logging/logging.module";

@Module({})
export class AppModule {
  /** The whole application, from configuration already parsed at boot. */
  static forRoot(config: AppConfig, logging: LoggingOptions = {}): DynamicModule {
    return {
      module: AppModule,
      imports: [
        AppConfigModule.forRoot(config),
        LoggingModule.forRoot(logging),
        CoreModule,
        PersistenceModule,
        AuthModule,
        UsersModule,
        HealthModule,
      ],
      providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
    };
  }
}
