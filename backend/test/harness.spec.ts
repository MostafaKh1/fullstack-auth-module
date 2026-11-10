import { getConnectionToken } from "@nestjs/mongoose";
import { Clock } from "../src/clock/clock";
import { startTestApp, type TestApp } from "./support/test-app";

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

    expect(app.nest.get(Clock).now().toISOString()).toBe("2030-05-06T07:08:10.000Z");
  });

  it("seeds and reads the same database the application is connected to", async () => {
    await app.db.collection("probes").insertOne({ seededBy: "harness" });

    const connection = app.nest.get(getConnectionToken());
    const seen = await connection.db.collection("probes").findOne({ seededBy: "harness" });
    expect(seen).toMatchObject({ seededBy: "harness" });
  });
});
