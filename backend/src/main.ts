import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import pino from "pino";
import { InvalidConfigError, loadConfig } from "@/config/app-env";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule.forRoot(config), { bufferLogs: true });
  configureApp(app);
  await app.listen(config.port);
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
