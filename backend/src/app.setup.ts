import type { INestApplication } from "@nestjs/common";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { jsonBody } from "@/common/middleware/json-body.middleware.js";
import { AppConfigService } from "@/config/app-config.service.js";
import { setupApiDocs } from "@/docs/api-document.js";

/** Wiring shared by `main.ts` and the test harness, so tests run the application exactly as production does. */
export async function configureApp(app: INestApplication): Promise<void> {
  const config = app.get(AppConfigService);
  app.useLogger(app.get(Logger));
  // A hop count, never `true`: trusting every X-Forwarded-For entry lets a client pick its own throttle bucket.
  app.getHttpAdapter().getInstance().set("trust proxy", config.get("trustProxy"));
  app.setGlobalPrefix("api");
  app.use(helmet());
  app.enableCors({ origin: config.get("corsOrigins"), credentials: true });
  app.use(...jsonBody(config.get("requestBodyLimit"), config.isProduction));
  await setupApiDocs(app);
  app.enableShutdownHooks();
}
