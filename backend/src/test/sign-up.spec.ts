import { scrypt } from "node:crypto";
import { startTestApp, type TestApp } from "./boot";
import { signUpExamples } from "./support/field-rules.examples";
import { refreshCookie } from "./support/refresh-cookie";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const valid = { email: "ada@example.com", name: "Ada Lovelace", password: "Passw0rd!" };

describe("Sign up", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.db.collection("users").deleteMany({});
    await app.db.collection("sessions").deleteMany({});
    app.clock.set(app.startedAt);
  });

  it("creates the User, starts a Session and answers 201 with an access token and the User", async () => {
    const response = await app.http().post("/api/auth/sign-up").send(valid);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      accessToken: expect.any(String),
      expiresIn: 900,
      user: {
        id: expect.any(String),
        email: "ada@example.com",
        name: "Ada Lovelace",
        createdAt: app.startedAt.toISOString(),
      },
    });
    const users = await app.db.collection("users").find().toArray();
    expect(users).toHaveLength(1);
    expect(users[0]._id.toString()).toBe(response.body.user.id);
    const sessions = await app.db.collection("sessions").find().toArray();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].userId.toString()).toBe(response.body.user.id);
  });

  it("sets the refresh cookie httpOnly, SameSite=Lax, scoped to the auth routes, for the Session's idle window", async () => {
    const response = await app.http().post("/api/auth/sign-up").send(valid);

    const cookie = refreshCookie(response.headers["set-cookie"]);
    expect(cookie).toMatch(/^refresh_credential=[0-9a-f]{24}\.[A-Za-z0-9_-]{43};/);
    expect(cookie).toContain("Path=/api/auth");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain(`Max-Age=${7 * 24 * 60 * 60}`);
    expect(cookie).not.toContain("Secure");
  });

  it("sets the refresh cookie to expire at the Session's idle expiry", async () => {
    app.clock.advance(HOUR);

    const response = await app.http().post("/api/auth/sign-up").send(valid);

    const idleExpiry = new Date(app.startedAt.getTime() + HOUR + 7 * DAY);
    expect(refreshCookie(response.headers["set-cookie"])).toContain(`Expires=${idleExpiry.toUTCString()}`);
  });

  it("stores the refresh secret only as its SHA-256 hash, with the Session's expiries", async () => {
    const response = await app.http().post("/api/auth/sign-up").set("User-Agent", "test-agent/1").send(valid);

    const credential = decodeURIComponent(refreshCookie(response.headers["set-cookie"]).split(/[=;]/)[1]);
    const [sessionId, secret] = credential.split(".");
    const session = await app.db.collection("sessions").findOne({});
    expect(session?._id.toString()).toBe(sessionId);
    expect(JSON.stringify(session)).not.toContain(secret);
    expect(session?.secretHash).toMatch(/^[0-9a-f]{64}$/);
    expect(session?.idleExpiresAt).toEqual(new Date(app.startedAt.getTime() + 7 * DAY));
    expect(session?.absoluteExpiresAt).toEqual(new Date(app.startedAt.getTime() + 30 * DAY));
    expect(session?.userAgent).toBe("test-agent/1");
    expect(session?.revokedAt ?? null).toBeNull();
  });

  it("stores the password only as a scrypt hash with its parameters and salt encoded", async () => {
    await app.http().post("/api/auth/sign-up").send(valid);

    const user = await app.db.collection("users").findOne({});
    expect(JSON.stringify(user)).not.toContain(valid.password);
    const match = /^scrypt\$17\$8\$1\$([A-Za-z0-9+/=]+)\$([A-Za-z0-9+/=]+)$/.exec(user?.passwordHash);
    expect(match).not.toBeNull();
    const [, salt, hash] = match as RegExpExecArray;
    const derived = await new Promise<Buffer>((resolve, reject) =>
      scrypt(
        valid.password,
        Buffer.from(salt, "base64"),
        64,
        { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 2 ** 17 * 8 },
        (error, key) => (error ? reject(error) : resolve(key)),
      ),
    );
    expect(derived.toString("base64")).toBe(hash);
  });

  it("never puts the password in a response or a log line", async () => {
    const password = "Unique-Passw0rd-in-logs!";
    const response = await app
      .http()
      .post("/api/auth/sign-up")
      .set("X-Request-Id", "sign-up-secret-check")
      .send({ ...valid, password });

    expect(response.status).toBe(201);
    expect(JSON.stringify(response.body)).not.toContain(password);
    expect(JSON.stringify(response.headers)).not.toContain(password);
    expect(JSON.stringify(app.logs())).not.toContain(password);
  });

  it("answers 409 user.email_taken for an email that already has a User, compared case-insensitively", async () => {
    await app.http().post("/api/auth/sign-up").send(valid).expect(201);

    const response = await app
      .http()
      .post("/api/auth/sign-up")
      .send({ ...valid, email: "  ADA@Example.com", name: "Someone Else" });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: "user.email_taken", status: 409, retryable: false });
    expect(await app.db.collection("users").countDocuments()).toBe(1);
  });

  it("lets exactly one of two concurrent Sign ups with the same email succeed; the other answers 409", async () => {
    const [first, second] = await Promise.all([
      app.http().post("/api/auth/sign-up").send(valid),
      app
        .http()
        .post("/api/auth/sign-up")
        .send({ ...valid, email: "ADA@example.com" }),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);
    const rejected = first.status === 409 ? first : second;
    expect(rejected.body.code).toBe("user.email_taken");
    expect(await app.db.collection("users").countDocuments()).toBe(1);
  });

  it("answers 400 request.malformed for a body that is not a JSON object", async () => {
    const response = await app
      .http()
      .post("/api/auth/sign-up")
      .set("Content-Type", "application/json")
      .send("[1]");

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("request.malformed");
  });

  it("reports every broken field at once", async () => {
    const response = await app.http().post("/api/auth/sign-up").send({ email: "ada", name: "ab" });

    expect(response.status).toBe(400);
    expect(response.body.issues).toEqual([
      { path: ["email"], code: "email.invalid" },
      { path: ["name"], code: "name.too_short" },
      { path: ["password"], code: "field.required" },
    ]);
  });
});

describe("Sign up with COOKIE_SECURE", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await startTestApp({ COOKIE_SECURE: "true", PASSWORD_HASH_COST: "10" });
  });

  afterAll(async () => {
    await app.close();
  });

  it("marks the refresh cookie Secure", async () => {
    const response = await app.http().post("/api/auth/sign-up").send(valid);

    expect(refreshCookie(response.headers["set-cookie"])).toMatch(/; Secure(;|$)/);
  });
});

describe("Sign up field rules: the worked examples", () => {
  let app: TestApp;

  beforeAll(async () => {
    // Cheap hashing: these rows test the field rules, not the hash.
    app = await startTestApp({ PASSWORD_HASH_COST: "10" });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Several rows normalise to the same email.
    await app.db.collection("users").deleteMany({});
  });

  it.each(signUpExamples)("$field $note", async (example) => {
    const body: Record<string, unknown> = { ...valid };
    if (example.input === undefined) delete body[example.field];
    else body[example.field] = example.input;

    const response = await app.http().post("/api/auth/sign-up").send(body);

    if (example.valid) {
      expect(response.status).toBe(201);
      if (example.stored !== undefined && example.field !== "password") {
        const user = await app.db.collection("users").findOne({});
        expect(user?.[example.field]).toBe(example.stored);
      }
    } else {
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        code: "request.validation_failed",
        status: 400,
        retryable: false,
      });
      expect(response.body.issues).toEqual(example.codes.map((code) => ({ path: [example.field], code })));
    }
  });
});
