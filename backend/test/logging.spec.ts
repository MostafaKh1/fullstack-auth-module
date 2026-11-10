import { startTestApp, type TestApp } from "./support/test-app";

describe("structured logs", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("logs each request as one JSON line carrying its request id", async () => {
    await app.http().get("/api/health").set("X-Request-Id", "log-line-1");

    const line = app
      .logs()
      .find((entry) => entry.msg === "request completed" && hasRequestId(entry, "log-line-1"));
    expect(line).toBeDefined();
    expect(line).toMatchObject({ req: { method: "GET", url: "/api/health" }, res: { statusCode: 200 } });
  });

  it("redacts the Authorization header and cookies", async () => {
    await app
      .http()
      .get("/api/health")
      .set("X-Request-Id", "log-line-2")
      .set("Authorization", "Bearer secret-access-token-value")
      .set("Cookie", "refresh=secret-refresh-credential");

    const lines = app.logs().filter((entry) => hasRequestId(entry, "log-line-2"));
    expect(lines.length).toBeGreaterThan(0);
    const written = JSON.stringify(lines);
    expect(written).not.toContain("secret-access-token-value");
    expect(written).not.toContain("secret-refresh-credential");
    expect(lines[0]).toMatchObject({
      req: { headers: { authorization: "[Redacted]", cookie: "[Redacted]" } },
    });
  });
});

function hasRequestId(entry: Record<string, unknown>, id: string): boolean {
  const req = entry.req as { id?: unknown } | undefined;
  return req?.id === id;
}
