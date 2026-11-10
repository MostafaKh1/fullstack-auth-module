import { spawn } from "node:child_process";
import path from "node:path";
import { testEnv } from "./boot";

const backendRoot = path.resolve(__dirname, "..", "..");

type Exit = { code: number | null; output: string };

/** Starts the real entry point, `src/main.ts`, with exactly the given environment. */
function startApi(env: Record<string, string>): Promise<Exit> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-r", "ts-node/register/transpile-only", "src/main.ts"], {
      cwd: backendRoot,
      env: { PATH: process.env.PATH ?? "", SystemRoot: process.env.SystemRoot ?? "", ...env },
    });
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

  it("refuses insecure cookies in production", async () => {
    const exit = await startApi({
      ...testEnv,
      NODE_ENV: "production",
      MONGODB_URI: "mongodb://localhost:27017/auth",
      COOKIE_SECURE: "false",
    });

    expect(exit.code).not.toBe(0);
    expect(exit.output).toContain("COOKIE_SECURE");
  });
});
