import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MongoMemoryServer } from "mongodb-memory-server";
import pino from "pino";
import { startThrowawayMongo } from "@/test/support/throwaway-mongo.js";
import { type LogLine, testEnv } from "./boot.js";

const backendRoot = fileURLToPath(new URL("../../", import.meta.url));
// The arguments that let plain Node run the TypeScript entry point; the end-to-end suite starts the API with the same file.
const registerArgs: string[] = JSON.parse(
  readFileSync(path.join(backendRoot, "node-register-args.json"), "utf8"),
);

type Exit = { code: number | null; output: string; stoppedOn?: LogLine };

// Runs the real entry point, `src/main.ts`, with exactly the given environment until it exits, or until it logs the
// JSON line whose message is `stopOn`, which then stops it.
function startApi(env: Record<string, string>, stopOn?: string): Promise<Exit> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...registerArgs, "src/main.ts"], {
      cwd: backendRoot,
      env: { PATH: process.env.PATH ?? "", SystemRoot: process.env.SystemRoot ?? "", ...env },
    });
    let output = "";
    let unfinishedLine = "";
    let stoppedOn: LogLine | undefined;
    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      output += text;
      const lines = (unfinishedLine + text).split("\n");
      unfinishedLine = lines.pop() ?? "";
      for (const line of lines) {
        if (stopOn === undefined || stoppedOn !== undefined) break;
        const logged = parseLogLine(line);
        if (logged?.msg === stopOn) {
          stoppedOn = logged;
          child.kill();
        }
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(
        new Error(
          `the API did not ${stopOn ? `log ${stopOn}` : "exit"} within 20 s; output so far:\n${output}`,
        ),
      );
    }, 20_000);
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ code, output, stoppedOn });
    });
  });
}

function parseLogLine(line: string): LogLine | undefined {
  try {
    return JSON.parse(line) as LogLine;
  } catch {
    return undefined;
  }
}

// The start-up line's URLs are built from the configured port, so the API cannot be given 0 and pick its own.
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      server.close(() => {
        if (address !== null && typeof address === "object") resolve(address.port);
        else reject(new Error("no port was assigned"));
      });
    });
  });
}

describe("starting with valid configuration", () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await startThrowawayMongo();
  });

  afterAll(async () => {
    await mongo.stop();
  });

  it("logs app.listening with the API's URL and its docs URL once it listens", async () => {
    const port = await freePort();
    const exit = await startApi(
      { ...testEnv, PORT: String(port), MONGODB_URI: mongo.getUri("auth-test") },
      "app.listening",
    );

    if (exit.stoppedOn === undefined) throw new Error(`the API exited before app.listening:\n${exit.output}`);
    const { level, time: _time, pid: _pid, hostname: _hostname, msg: _msg, ...fields } = exit.stoppedOn;
    expect(level).toBe(pino.levels.values.info);
    expect(fields).toEqual({
      url: `http://localhost:${port}/api`,
      docs: `http://localhost:${port}/api/docs`,
    });
  });
});

describe("starting with invalid configuration", () => {
  it("exits non-zero and names every missing or invalid variable", async () => {
    const { MONGODB_URI: _absent, ...withoutUri } = { ...testEnv, MONGODB_URI: "unused" };
    const exit = await startApi({
      ...withoutUri,
      PORT: "not-a-port",
      LOG_LEVEL: "chatty",
      JWT_ACCESS_SECRET: "too-short-secret",
    });

    expect(exit.code).not.toBe(0);
    expect(exit.code).not.toBeNull();
    for (const variable of ["MONGODB_URI", "PORT", "LOG_LEVEL", "JWT_ACCESS_SECRET"]) {
      expect(exit.output).toContain(variable);
    }
    expect(exit.output).toContain("config.invalid");
  });

  it("never prints the value of a rejected secret", async () => {
    const exit = await startApi({
      ...testEnv,
      MONGODB_URI: "mongodb://localhost:27017/auth",
      JWT_ACCESS_SECRET: "leaky-short-secret",
    });

    expect(exit.code).not.toBe(0);
    expect(exit.output).toContain("JWT_ACCESS_SECRET");
    expect(exit.output).not.toContain("leaky-short-secret");
  });

  it("refuses a MongoDB connection string without credentials in production", async () => {
    const exit = await startApi({
      ...testEnv,
      NODE_ENV: "production",
      MONGODB_URI: "mongodb://mongo:27017/auth",
      COOKIE_SECURE: "true",
    });

    expect(exit.code).not.toBe(0);
    expect(exit.output).toContain("MONGODB_URI");
    expect(exit.output).toContain("credentials");
  });

  it("refuses insecure cookies in production", async () => {
    const exit = await startApi({
      ...testEnv,
      NODE_ENV: "production",
      MONGODB_URI: "mongodb://app:secret@localhost:27017/auth",
      COOKIE_SECURE: "false",
    });

    expect(exit.code).not.toBe(0);
    expect(exit.output).toContain("COOKIE_SECURE");
  });

  it("refuses the access-token secret published in .env.example in production", async () => {
    const exit = await startApi({
      ...testEnv,
      NODE_ENV: "production",
      MONGODB_URI: "mongodb://app:secret@localhost:27017/auth",
      COOKIE_SECURE: "true",
      JWT_ACCESS_SECRET: "dev-only-access-secret-change-me-0123456789",
    });

    expect(exit.code).not.toBe(0);
    expect(exit.output).toContain("must not be the example value");
    expect(exit.output).not.toContain("dev-only-access-secret");
  });
});
