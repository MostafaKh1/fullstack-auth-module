import { Writable } from "node:stream";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { type Db, MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { AppModule } from "../app.module";
import { configureApp } from "../app.setup";
import { parseConfig } from "../config/app-env";
import { ClockService } from "../core/clock.service";
import { FakeClock } from "./support/fake-clock";

/** One structured log line as the application wrote it. */
export type LogLine = Record<string, unknown> & { level: number; msg?: string };

export type TestApp = {
  /** The running Nest application, for harness self-checks only; tests drive it over HTTP. */
  nest: INestApplication;
  /** A supertest client bound to the running application. */
  http: () => ReturnType<typeof request>;
  /** Where the clock started: the real time the app booted, so Sessions it stores outlive MongoDB's TTL monitor. */
  startedAt: Date;
  /** The clock the application reads; set or advance it to move time. */
  clock: FakeClock;
  /** The application's database, for seeding and inspecting raw collections. */
  db: Db;
  /** Every log line written so far. */
  logs: () => LogLine[];
  /** Stops the throwaway MongoDB, so the application sees its database as unreachable. */
  stopDatabase: () => Promise<void>;
  close: () => Promise<void>;
};

/** The environment every test app starts from: the documented defaults, with test-only values. */
export const testEnv: Record<string, string> = {
  NODE_ENV: "test",
  PORT: "0",
  LOG_LEVEL: "info",
  JWT_ACCESS_SECRET: "test-only-access-secret-0123456789abcdef",
  CORS_ORIGINS: "http://localhost:5173",
  ACCESS_TOKEN_TTL_SECONDS: "900",
  SESSION_IDLE_TTL_DAYS: "7",
  SESSION_ABSOLUTE_TTL_DAYS: "30",
  REFRESH_GRACE_SECONDS: "10",
  PASSWORD_HASH_COST: "17",
  COOKIE_SECURE: "false",
};

/**
 * Boots the real application, wired as in production, against its own throwaway MongoDB.
 * Only the clock and the log destination are swapped. Call once per test file.
 */
export async function startTestApp(env: Record<string, string> = {}): Promise<TestApp> {
  // A cold mongod on Windows can take longer than the 10 s default to start.
  const mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 30_000 } });
  const uri = mongo.getUri("auth-test");
  const config = parseConfig({ ...testEnv, MONGODB_URI: uri, ...env });

  const lines: LogLine[] = [];
  const logDestination = new Writable({
    write(chunk: Buffer, _encoding, done) {
      for (const line of chunk.toString("utf8").split("\n")) {
        if (line.trim() !== "") lines.push(JSON.parse(line) as LogLine);
      }
      done();
    },
  });

  // A date in the real past would let MongoDB's TTL monitor delete a test's Sessions mid-file: start at the real now.
  const startedAt = new Date();
  const clock = new FakeClock(startedAt);
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot(config, { logDestination })],
  })
    .overrideProvider(ClockService)
    .useValue(clock)
    .compile();

  const app: INestApplication = moduleRef.createNestApplication({ bufferLogs: true });
  configureApp(app);
  await app.init();

  const client = await MongoClient.connect(uri);
  let databaseRunning = true;

  return {
    nest: app,
    http: () => request(app.getHttpServer()),
    startedAt,
    clock,
    db: client.db(),
    logs: () => [...lines],
    stopDatabase: async () => {
      await client.close();
      await mongo.stop();
      databaseRunning = false;
    },
    close: async () => {
      await app.close();
      if (databaseRunning) {
        await client.close();
        await mongo.stop();
      }
    },
  };
}
