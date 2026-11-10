import { signInExamples } from "./field-rules.examples";
import { refreshCookie } from "./support/refresh-cookie";
import { startTestApp, type TestApp } from "./support/test-app";

const ada = { email: "ada@example.com", name: "Ada Lovelace", password: "Passw0rd!" };

describe("Sign in", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await startTestApp();
    await app.http().post("/api/auth/sign-up").send(ada).expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it("starts a new Session for valid credentials and answers 200 with an access token and the User", async () => {
    const sessionsBefore = await app.db.collection("sessions").countDocuments();

    const response = await app
      .http()
      .post("/api/auth/sign-in")
      .send({ email: "  ADA@example.com ", password: ada.password });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      accessToken: expect.any(String),
      expiresIn: 900,
      user: {
        id: expect.any(String),
        email: ada.email,
        name: ada.name,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    expect(await app.db.collection("sessions").countDocuments()).toBe(sessionsBefore + 1);
  });

  it("sets the refresh cookie httpOnly, SameSite=Lax, scoped to the auth routes, for the Session's idle window", async () => {
    const response = await app
      .http()
      .post("/api/auth/sign-in")
      .send({ email: ada.email, password: ada.password });

    const cookie = refreshCookie(response.headers["set-cookie"]);
    expect(cookie).toMatch(/^refresh_credential=[0-9a-f]{24}\.[A-Za-z0-9_-]{43};/);
    expect(cookie).toContain("Path=/api/auth");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain(`Max-Age=${7 * 24 * 60 * 60}`);
  });

  it("starts a separate Session on each Sign in", async () => {
    const first = await app
      .http()
      .post("/api/auth/sign-in")
      .send({ email: ada.email, password: ada.password });
    const second = await app
      .http()
      .post("/api/auth/sign-in")
      .send({ email: ada.email, password: ada.password });

    const sessionOf = (cookie: string) => cookie.split(/[=.]/)[1];
    expect(sessionOf(refreshCookie(first.headers["set-cookie"]))).not.toBe(
      sessionOf(refreshCookie(second.headers["set-cookie"])),
    );
  });

  it("answers 401 auth.invalid_credentials for a wrong password, without a cookie", async () => {
    const response = await app
      .http()
      .post("/api/auth/sign-in")
      .send({ email: ada.email, password: "Wr0ng-password!" });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ code: "auth.invalid_credentials", status: 401, retryable: false });
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("answers 401 auth.invalid_credentials for an unknown email", async () => {
    const response = await app
      .http()
      .post("/api/auth/sign-in")
      .send({ email: "nobody@example.com", password: ada.password });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ code: "auth.invalid_credentials", status: 401, retryable: false });
  });

  it("takes comparable time for an unknown email and a wrong password", async () => {
    const time = async (body: object) => {
      const started = process.hrtime.bigint();
      await app.http().post("/api/auth/sign-in").send(body).expect(401);
      return Number(process.hrtime.bigint() - started) / 1e6;
    };
    const unknown: number[] = [];
    const wrong: number[] = [];
    for (let round = 0; round < 3; round++) {
      unknown.push(await time({ email: "nobody@example.com", password: ada.password }));
      wrong.push(await time({ email: ada.email, password: "Wr0ng-password!" }));
    }

    const ratio = median(unknown) / median(wrong);
    expect(ratio).toBeGreaterThan(0.6);
    expect(ratio).toBeLessThan(1.6);
  });

  it("never puts the password in a response or a log line", async () => {
    const password = "Sign-in-Passw0rd-in-logs!";
    await app.http().post("/api/auth/sign-in").send({ email: ada.email, password });

    expect(JSON.stringify(app.logs())).not.toContain(password);
  });
});

describe("Sign in field rules: the worked examples", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await startTestApp({ PASSWORD_HASH_COST: "10" });
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(signInExamples)("$field $note", async (example) => {
    const body: Record<string, unknown> = { email: "nobody@example.com", password: "anything" };
    if (example.input === undefined) delete body[example.field];
    else body[example.field] = example.input;

    const response = await app.http().post("/api/auth/sign-in").send(body);

    if (example.valid) {
      // Passing validation reaches the credential check: no User has this email or password.
      expect(response.status).toBe(401);
      expect(response.body.code).toBe("auth.invalid_credentials");
    } else {
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: "request.validation_failed", status: 400 });
      expect(response.body.issues).toEqual(example.codes.map((code) => ({ path: example.field, code })));
    }
  });
});

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
