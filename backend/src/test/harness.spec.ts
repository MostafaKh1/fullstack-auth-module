import { getConnectionToken } from "@nestjs/mongoose";
import { ClockService } from "@/core/clock.service.js";
import { startTestApp, type TestApp } from "./boot.js";

// The harness is the seam every later back-end test stands on, so its promises are pinned here.
describe("the HTTP test harness", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("gives the application a clock the test controls", () => {
    app.clock.set(new Date("2030-05-06T07:08:09.000Z"));
    app.clock.advance(1_000);

    expect(app.nest.get(ClockService).now().toISOString()).toBe("2030-05-06T07:08:10.000Z");
  });

  it("starts the clock at the real current time, so MongoDB's TTL monitor never removes a test's Session", async () => {
    // A fresh app, so its clock is where the harness starts it. MongoDB deletes documents whose expiry has passed
    // in real time, every 60 s by default; the monitor is made to run every second here.
    const fresh = await startTestApp({ PASSWORD_HASH_COST: "10" });
    try {
      await fresh.db.admin().command({ setParameter: 1, ttlMonitorSleepSecs: 1 });
      await fresh
        .http()
        .post("/api/auth/sign-up")
        .send({ email: "ada@example.com", name: "Ada Lovelace", password: "Passw0rd!" })
        .expect(201);

      await new Promise((resolve) => setTimeout(resolve, 3_000));

      expect(await fresh.db.collection("sessions").countDocuments()).toBe(1);
    } finally {
      await fresh.close();
    }
  });

  it("seeds and reads the same database the application is connected to", async () => {
    await app.db.collection("probes").insertOne({ seededBy: "harness" });

    const connection = app.nest.get(getConnectionToken());
    const seen = await connection.db.collection("probes").findOne({ seededBy: "harness" });
    expect(seen).toMatchObject({ seededBy: "harness" });
  });
});
