import type { AppConfig } from "./app-env";

export class AppConfigService {
  constructor(private readonly config: AppConfig) {}

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  get isProduction(): boolean {
    return this.config.env === "production";
  }
}
