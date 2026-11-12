import { createHmac } from "node:crypto";
import { startTestApp, type TestApp } from "./boot.js";

const ada = { email: "ada@example.com", name: "Ada Lovelace", password: "Passw0rd!" };

describe("the protected endpoint GET /api/users/me", () => {
  let app: TestApp;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await startTestApp({ PASSWORD_HASH_COST: "10" });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.db.collection("users").deleteMany({});
    await app.db.collection("sessions").deleteMany({});
    app.clock.set(app.startedAt);
    const response = await app.http().post("/api/auth/sign-up").send(ada).expect(201);
    accessToken = response.body.accessToken;
    userId = response.body.user.id;
  });

  it("returns the signed-in User for a valid access token", async () => {
    const response = await app.http().get("/api/users/me").set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: userId,
      email: ada.email,
      name: ada.name,
      createdAt: app.startedAt.toISOString(),
    });
  });

  it("still accepts the access token just before it expires", async () => {
    app.clock.advance(15 * 60 * 1000 - 1000);

    const response = await app.http().get("/api/users/me").set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
  });

  it.each([
    ["missing", undefined],
    ["not a Bearer token", "Basic YWRhOnBhc3N3b3Jk"],
    ["not a JWT", "Bearer not-a-token"],
  ])("answers 401 auth.unauthenticated when the access token is %s", async (_case, header) => {
    const request = app.http().get("/api/users/me");
    if (header) request.set("Authorization", header);

    const response = await request;

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ code: "auth.unauthenticated", status: 401, retryable: false });
  });

  it("answers 401 auth.unauthenticated for a forged access token", async () => {
    const [header, payload] = accessToken.split(".");
    const forgedSignature = createHmac("sha256", "not-the-server-secret-0123456789abcdef")
      .update(`${header}.${payload}`)
      .digest("base64url");

    const response = await app
      .http()
      .get("/api/users/me")
      .set("Authorization", `Bearer ${header}.${payload}.${forgedSignature}`);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("auth.unauthenticated");
  });

  it("answers 401 auth.unauthenticated for a token whose payload was altered", async () => {
    const [header, , signature] = accessToken.split(".");
    const otherPayload = Buffer.from(JSON.stringify({ sub: "0".repeat(24), sid: "0".repeat(24) })).toString(
      "base64url",
    );

    const response = await app
      .http()
      .get("/api/users/me")
      .set("Authorization", `Bearer ${header}.${otherPayload}.${signature}`);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("auth.unauthenticated");
  });

  it("answers 401 auth.unauthenticated for an expired access token", async () => {
    app.clock.advance(15 * 60 * 1000 + 1000);

    const response = await app.http().get("/api/users/me").set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("auth.unauthenticated");
  });

  it("answers 401 auth.unauthenticated once the token's Session is revoked", async () => {
    await app.db
      .collection("sessions")
      .updateMany({}, { $set: { revokedAt: app.startedAt, revokedReason: "sign-out" } });

    const response = await app.http().get("/api/users/me").set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("auth.unauthenticated");
  });

  it("answers 401 auth.unauthenticated once the token's Session is gone", async () => {
    await app.db.collection("sessions").deleteMany({});

    const response = await app.http().get("/api/users/me").set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("auth.unauthenticated");
  });

  it("answers 401 auth.unauthenticated once the token's Session is past its idle expiry", async () => {
    await app.db.collection("sessions").updateMany({}, { $set: { idleExpiresAt: app.startedAt } });

    const response = await app.http().get("/api/users/me").set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("auth.unauthenticated");
  });

  it("keeps public routes reachable without a token", async () => {
    const response = await app.http().get("/api/health");

    expect(response.status).toBe(200);
  });
});
