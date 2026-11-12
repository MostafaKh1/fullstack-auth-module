import "reflect-metadata";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "@/app.module.js";
import { parseConfig } from "@/config/app-env.js";
import { buildOpenApiDocument } from "./api-document.js";

const CONTRACT = fileURLToPath(new URL("../../../contract/openapi.json", import.meta.url));

/** Preview mode scans the routes without instantiating providers, so no database is needed. */
async function renderContract(): Promise<string> {
  const config = parseConfig({
    NODE_ENV: "development",
    MONGODB_URI: "mongodb://localhost:27017/contract",
    JWT_ACCESS_SECRET: "contract-export-only-secret-0123456789",
    CORS_ORIGINS: "http://localhost:5173",
  });
  const app = await NestFactory.create(AppModule.forRoot(config), { preview: true, logger: false });
  app.setGlobalPrefix("api");
  const text = `${JSON.stringify(await buildOpenApiDocument(app), null, 2)}\n`;
  await app.close();
  return text;
}

async function main(): Promise<void> {
  const text = await renderContract();
  if (process.argv.includes("--check")) {
    if (readFileSync(CONTRACT, "utf8") !== text) {
      process.stderr.write(
        "contract/openapi.json is stale: run `npm run openapi -w backend` and commit it.\n",
      );
      process.exitCode = 1;
    }
    return;
  }
  writeFileSync(CONTRACT, text);
}

void main();
