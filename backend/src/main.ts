import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { PinoLogger } from "nestjs-pino";
import pino from "pino";
import { InvalidConfigError, loadConfig } from "@/config/app-env.js";
import { AppModule } from "./app.module.js";
import { configureApp } from "./app.setup.js";

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule.forRoot(config), { bufferLogs: true });
  await configureApp(app);
  await app.listen(config.port);
  // The server listens on every interface, so it has no one address; localhost and the port are what a developer opens.
  const origin = `http://localhost:${config.port}`;
  const logger = await app.resolve(PinoLogger);
  logger.info({ url: `${origin}/api`, docs: `${origin}/api/docs` }, "app.listening");
}

bootstrap().catch((error: unknown) => {
  // Nest's logger may not exist yet (configuration failed before it was built), so log through a bare pino.
  const logger = pino();
  if (error instanceof InvalidConfigError) {
    logger.fatal({ problems: error.problems }, "config.invalid");
  } else {
    logger.fatal({ err: error }, "boot.failed");
  }
  process.exitCode = 1;
});
