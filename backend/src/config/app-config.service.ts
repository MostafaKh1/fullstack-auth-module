import type { AppConfig } from "./config.schema";

/** The validated configuration; the only way the application reads its environment. */
export class AppConfigService {
  constructor(private readonly config: AppConfig) {}

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  get isProduction(): boolean {
    return this.config.env === "production";
  }
}
