import type { INestApplication } from "@nestjs/common";
import { Logger } from "nestjs-pino";

/** Wiring shared by `main.ts` and the test harness, so tests run the application exactly as production does. */
export function configureApp(app: INestApplication): void {
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix("api");
  app.enableShutdownHooks();
}
