import type { INestApplication, NestApplicationOptions } from "@nestjs/common";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { jsonBody } from "@/common/middleware/json-body.middleware.js";
import { AppConfigService } from "@/config/app-config.service.js";
import { setupApiDocs } from "@/docs/api-document.js";

/** Builds the bare Nest application: with `NestFactory` in `main.ts`, from the testing module in the harness. */
export type NestAppBuilder = (
  options: NestApplicationOptions,
) => INestApplication | Promise<INestApplication>;

/** Creates and wires the application for `main.ts` and the test harness, so tests run it as production does. */
export async function createApp(build: NestAppBuilder): Promise<INestApplication> {
  // Nest's own body parsers stay off: its urlencoded one would read a cross-site form post as data (login CSRF,
  // ADR 0001), past our body cap. The JSON parser below is the only one.
  const app = await build({ bufferLogs: true, bodyParser: false });
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
  return app;
}
