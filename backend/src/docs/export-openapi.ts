import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildOpenApiDocument } from "./api-document.js";

const CONTRACT = fileURLToPath(new URL("../../../contract/openapi.json", import.meta.url));

async function main(): Promise<void> {
  const text = `${JSON.stringify(await buildOpenApiDocument(), null, 2)}\n`;
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
