import { type DynamicModule, Global, Module } from "@nestjs/common";
import { AppConfigService } from "./app-config.service.js";
import type { AppConfig } from "./app-env.js";

@Global()
@Module({})
export class AppConfigModule {
  /** Takes configuration already parsed at boot, so an invalid environment never reaches Nest. */
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppConfigModule,
      providers: [{ provide: AppConfigService, useValue: new AppConfigService(config) }],
      exports: [AppConfigService],
    };
  }
}
