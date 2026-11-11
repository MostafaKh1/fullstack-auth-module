// E2E_MONGODB_URI (CI's service container) wins; otherwise a throwaway mongodb-memory-server, so no Docker is needed.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

let memoryServer;
let uri = process.env.E2E_MONGODB_URI;
if (!uri) {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  memoryServer = await MongoMemoryServer.create();
  uri = memoryServer.getUri("auth_e2e");
}

const backendDir = fileURLToPath(new URL("../../backend", import.meta.url));
const child = spawn(
  process.execPath,
  ["-r", "ts-node/register/transpile-only", "-r", "tsconfig-paths/register", "src/main.ts"],
  {
    cwd: backendDir,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      LOG_LEVEL: "warn",
      MONGODB_URI: uri,
      JWT_ACCESS_SECRET: "e2e-only-access-secret-0123456789-abcdef",
      // The lowest cost the schema allows: hashing speed is not what the journeys test.
      PASSWORD_HASH_COST: "10",
      COOKIE_SECURE: "false",
    },
  },
);

async function stop(code) {
  await memoryServer?.stop();
  process.exit(code);
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}
child.on("exit", (code) => stop(code ?? 0));
