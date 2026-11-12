import { startTestApp, type TestApp } from "./boot.js";

const ENVELOPE = (code: string, status: number) => ({
  code,
  status,
  traceId: expect.any(String),
  retryable: expect.any(Boolean),
  message: expect.any(String),
});

describe("throttling of Sign up, Sign in and refresh", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await startTestApp({ THROTTLE_LIMIT: "3", THROTTLE_TTL_SECONDS: "60" });
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 429 request.rate_limited to Sign in past the limit, in the error envelope", async () => {
    const attempt = () => app.http().post("/api/auth/sign-in").send({ email: "a@b.co", password: "x" });

    for (let i = 0; i < 3; i++) expect((await attempt()).status).toBe(401);
    const limited = await attempt();

    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ ...ENVELOPE("request.rate_limited", 429), retryable: true });
  });

  it("counts Sign up separately from Sign in, and leaves the other routes unthrottled", async () => {
    // The Sign in limit is spent above; an invalid Sign up body still reaches validation.
    const signUp = await app.http().post("/api/auth/sign-up").send({});
    expect(signUp.status).toBe(400);

    for (let i = 0; i < 6; i++) {
      expect((await app.http().get("/api/health")).status).toBe(200);
    }
  });

  it("throttles Sign up past the limit", async () => {
    const attempt = () => app.http().post("/api/auth/sign-up").send({});
    // one was spent by the previous example
    expect((await attempt()).status).toBe(400);
    expect((await attempt()).status).toBe(400);
    expect((await attempt()).status).toBe(429);
  });

  it("throttles refresh past the limit, counted apart from Sign in", async () => {
    const attempt = () => app.http().post("/api/auth/refresh");

    for (let i = 0; i < 3; i++) expect((await attempt()).status).toBe(401);
    const limited = await attempt();

    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ ...ENVELOPE("request.rate_limited", 429), retryable: true });
  });
});

describe("security headers, CORS, body cap and malformed JSON", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("sends security headers and does not announce Express", async () => {
    const response = await app.http().get("/api/health");

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["strict-transport-security"]).toBeDefined();
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("allows a configured origin, with credentials", async () => {
    const response = await app
      .http()
      .options("/api/auth/sign-in")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST");

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not allow an origin outside the configured ones", async () => {
    const response = await app.http().get("/api/health").set("Origin", "http://evil.example");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("answers an oversized body with 413 request.too_large in the envelope", async () => {
    const response = await app
      .http()
      .post("/api/auth/sign-in")
      .send({ email: "a@b.co", password: "x".repeat(200_000) });

    expect(response.status).toBe(413);
    expect(response.body).toEqual(ENVELOPE("request.too_large", 413));
    expect(response.body.traceId).toBe(response.headers["x-request-id"]);
  });

  it("answers malformed JSON with 400 request.malformed in the envelope", async () => {
    const response = await app
      .http()
      .post("/api/auth/sign-in")
      .set("Content-Type", "application/json")
      .send('{"email": ');

    expect(response.status).toBe(400);
    expect(response.body).toEqual(ENVELOPE("request.malformed", 400));
    expect(response.body.traceId).toBe(response.headers["x-request-id"]);
  });

  it("answers a JSON body in an unsupported charset with 400 request.malformed, and logs no error", async () => {
    // A parser error can be logged before the request logger has tagged the request: look at every line it writes.
    const linesBefore = app.logs().length;

    const response = await app
      .http()
      .post("/api/auth/sign-in")
      .set("X-Request-Id", "unsupported-charset")
      .set("Content-Type", "application/json; charset=latin1")
      .send('{"email": "a@b.co", "password": "x"}');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ ...ENVELOPE("request.malformed", 400), traceId: "unsupported-charset" });
    const errors = app
      .logs()
      .slice(linesBefore)
      .filter((entry) => entry.level >= 50);
    expect(errors).toEqual([]);
  });
});
