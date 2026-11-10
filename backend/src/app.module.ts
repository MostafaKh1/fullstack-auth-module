import { type DynamicModule, Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ClockModule } from "./clock/clock.module";
import { AppConfigModule } from "./config/app-config.module";
import type { AppConfig } from "./config/config.schema";
import { DatabaseModule } from "./database/database.module";
import { ApiExceptionFilter } from "./errors/api-exception.filter";
import { HealthModule } from "./features/health/health.module";
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
        ClockModule,
        DatabaseModule,
        HealthModule,
      ],
      providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
    };
  }
}
