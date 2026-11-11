import type { INestApplication } from "@nestjs/common";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { jsonBody } from "./common/middleware/json-body.middleware";
import { AppConfigService } from "./config/app-config.service";
import { setupApiDocs } from "./docs/api-document";

/** Wiring shared by `main.ts` and the test harness, so tests run the application exactly as production does. */
export function configureApp(app: INestApplication): void {
  const config = app.get(AppConfigService);
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix("api");
  app.use(helmet());
  app.enableCors({ origin: config.get("corsOrigins"), credentials: true });
  app.use(...jsonBody(config.get("requestBodyLimit"), config.isProduction));
  setupApiDocs(app);
  app.enableShutdownHooks();
}
