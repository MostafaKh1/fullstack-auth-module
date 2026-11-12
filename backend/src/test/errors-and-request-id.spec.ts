import { startTestApp, type TestApp } from "./boot.js";

describe("the error envelope and the request id", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers an unknown route with 404 route.not_found in the error envelope", async () => {
    const response = await app.http().get("/api/no-such-route");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: "route.not_found",
      status: 404,
      traceId: expect.any(String),
      retryable: false,
      message: expect.any(String),
    });
  });

  it("gives every error a traceId equal to the X-Request-Id response header", async () => {
    const response = await app.http().get("/api/no-such-route");

    expect(response.headers["x-request-id"]).toEqual(expect.any(String));
    expect(response.body.traceId).toBe(response.headers["x-request-id"]);
  });

  it("reuses a request id the caller supplies", async () => {
    const response = await app.http().get("/api/no-such-route").set("X-Request-Id", "caller-req-42");

    expect(response.headers["x-request-id"]).toBe("caller-req-42");
    expect(response.body.traceId).toBe("caller-req-42");
  });

  it("replaces a supplied request id that is not a plain short token", async () => {
    const response = await app
      .http()
      .get("/api/no-such-route")
      .set("X-Request-Id", "has spaces and {braces}");

    expect(response.headers["x-request-id"]).toEqual(expect.any(String));
    expect(response.headers["x-request-id"]).not.toBe("has spaces and {braces}");
    expect(response.body.traceId).toBe(response.headers["x-request-id"]);
  });

  it("returns a request id on successful responses too", async () => {
    const response = await app.http().get("/api/health").set("X-Request-Id", "health-check-1");

    expect(response.status).toBe(200);
    expect(response.headers["x-request-id"]).toBe("health-check-1");
  });
});

describe("the error envelope in production", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await startTestApp({ NODE_ENV: "production", COOKIE_SECURE: "true" });
  });

  afterAll(async () => {
    await app.close();
  });

  it("omits the developer message", async () => {
    const response = await app.http().get("/api/no-such-route");

    expect(response.status).toBe(404);
    expect(response.body).not.toHaveProperty("message");
    expect(response.body).toMatchObject({ code: "route.not_found", status: 404, retryable: false });
  });
});
