import { startTestApp, type TestApp } from "./boot";

describe("GET /api/health", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("reports the API and its database as up", async () => {
    const response = await app.http().get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", database: "up" });
  });

  it("answers 503 server.unavailable within a couple of seconds once the database is unreachable", async () => {
    await app.stopDatabase();

    const startedAt = performance.now();
    const response = await app.http().get("/api/health");
    const elapsedMs = performance.now() - startedAt;

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ code: "server.unavailable", status: 503, retryable: true });
    expect(elapsedMs).toBeLessThan(3_000);
  });
});
