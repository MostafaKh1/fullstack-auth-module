import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";
import { testEnv } from "./boot.js";

const backendRoot = fileURLToPath(new URL("../../", import.meta.url));
// The arguments that let plain Node run the TypeScript entry point; the end-to-end suite starts the API with the same file.
const registerArgs: string[] = JSON.parse(
  readFileSync(path.join(backendRoot, "node-register-args.json"), "utf8"),
);

type Exit = { code: number | null; output: string };
type LogLine = Record<string, unknown> & { msg?: string };

/** Spawns the real entry point, `src/main.ts`, with exactly the given environment. */
function spawnApi(env: Record<string, string>) {
  return spawn(process.execPath, [...registerArgs, "src/main.ts"], {
    cwd: backendRoot,
    env: { PATH: process.env.PATH ?? "", SystemRoot: process.env.SystemRoot ?? "", ...env },
  });
}

/** Starts the real entry point and waits for it to exit. */
function startApi(env: Record<string, string>): Promise<Exit> {
  return new Promise((resolve, reject) => {
    const child = spawnApi(env);
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`the API did not exit within 20 s; output so far:\n${output}`));
    }, 20_000);
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ code, output });
    });
  });
}

/** A port nothing listens on, since the start-up line's URLs are built from the configured port (0 would be useless). */
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

/** Starts the real entry point, waits for the first JSON log line whose message is `msg`, then stops the process. */
function startApiUntilLogged(env: Record<string, string>, msg: string): Promise<LogLine> {
  return new Promise((resolve, reject) => {
    const child = spawnApi(env);
    let output = "";
    let unfinishedLine = "";
    let found: LogLine | undefined;
    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      output += text;
      const lines = (unfinishedLine + text).split("\n");
      unfinishedLine = lines.pop() ?? "";
      for (const line of lines) {
        if (found !== undefined || !line.startsWith("{")) continue;
        const parsed = JSON.parse(line) as LogLine;
        if (parsed.msg === msg) {
          found = parsed;
          child.kill();
        }
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    const timer = setTimeout(() => {
      child.kill();
    }, 20_000);
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (found !== undefined) resolve(found);
      else reject(new Error(`no ${msg} line before the API stopped (exit ${code}); output:\n${output}`));
    });
  });
}

describe("starting with valid configuration", () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    // A cold mongod on Windows can take longer than the 10 s default to start.
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 30_000 } });
  });

  afterAll(async () => {
    await mongo.stop();
  });

  it("logs app.listening with the API's URL and its docs URL once it listens", async () => {
    const port = await freePort();
    const line = await startApiUntilLogged(
      { ...testEnv, PORT: String(port), MONGODB_URI: mongo.getUri("auth-test") },
      "app.listening",
    );

    const { level, time: _time, pid: _pid, hostname: _hostname, msg: _msg, ...fields } = line;
    expect(level).toBe(30);
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
