import { createHash } from "node:crypto";
import { startTestApp, type TestApp } from "./boot";
import { refreshCookie } from "./support/refresh-cookie";

const ada = { email: "ada@example.com", name: "Ada Lovelace", password: "Passw0rd!" };

const SECOND = 1000;
const DAY = 24 * 60 * 60 * SECOND;
const frontEnd = "http://localhost:5173";

/** The `<sessionId>.<secret>` a response's refresh cookie carries. */
function credentialOf(response: { headers: Record<string, unknown> }): string {
  const cookie = refreshCookie(response.headers["set-cookie"] as string[] | undefined);
  return decodeURIComponent(cookie.split(/[=;]/)[1]);
}

describe("refresh: POST /api/auth/refresh", () => {
  let app: TestApp;
  let credential: string;
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
    credential = credentialOf(response);
    userId = response.body.user.id;
  });

  function refresh(presented: string | null = credential) {
    const request = app.http().post("/api/auth/refresh");
    if (presented !== null) request.set("Cookie", `refresh_credential=${encodeURIComponent(presented)}`);
    return request;
  }

  async function storedSession() {
    return app.db.collection("sessions").findOne({});
  }

  it("rotates the refresh credential and answers 200 with a new access token and the User", async () => {
    const response = await refresh();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      accessToken: expect.any(String),
      expiresIn: 900,
      user: { id: userId, email: ada.email, name: ada.name, createdAt: app.startedAt.toISOString() },
    });
    const rotated = credentialOf(response);
    expect(rotated.split(".")[0]).toBe(credential.split(".")[0]);
    expect(rotated).not.toBe(credential);
    const session = await storedSession();
    expect(session?.secretHash).toBe(createHash("sha256").update(rotated.split(".")[1]).digest("hex"));
  });

  it("issues an access token the protected endpoint accepts", async () => {
    const response = await refresh();

    const me = await app
      .http()
      .get("/api/users/me")
      .set("Authorization", `Bearer ${response.body.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.id).toBe(userId);
  });

  it("sets the new cookie httpOnly, SameSite=Lax, scoped to the auth routes, for the slid idle window", async () => {
    app.clock.advance(2 * DAY);

    const response = await refresh();

    const cookie = refreshCookie(response.headers["set-cookie"]);
    expect(cookie).toContain("Path=/api/auth");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain(`Max-Age=${7 * 24 * 60 * 60}`);
  });

  it("accepts the rotated credential on the next refresh", async () => {
    const first = await refresh();

    const second = await refresh(credentialOf(first));

    expect(second.status).toBe(200);
  });

  it("accepts the immediately previous credential within the 10 second grace window, without replacing the cookie", async () => {
    const first = await refresh();
    app.clock.advance(10 * SECOND);

    const again = await refresh(credential);

    expect(again.status).toBe(200);
    expect(again.body.user.id).toBe(userId);
    // The cookie the rotation set stays the current credential, whichever tab's response the browser keeps.
    expect(again.headers["set-cookie"]).toBeUndefined();
    expect((await refresh(credentialOf(first))).status).toBe(200);
  });

  it("lets two tabs refreshing at the same moment both stay signed in", async () => {
    const [one, two] = await Promise.all([refresh(), refresh()]);

    expect([one.status, two.status]).toEqual([200, 200]);
    expect((await storedSession())?.revokedAt ?? null).toBeNull();
  });

  it("revokes the Session when the previous credential is replayed after the grace window", async () => {
    const first = await refresh();
    app.clock.advance(11 * SECOND);

    const replay = await refresh(credential);

    expect(replay.status).toBe(401);
    expect(replay.body).toMatchObject({ code: "auth.session_expired", status: 401, retryable: false });
    const session = await storedSession();
    expect(session?.revokedReason).toBe("reuse-detected");
    expect(session?.revokedAt).toEqual(app.clock.now());
    expect((await refresh(credentialOf(first))).body.code).toBe("auth.session_expired");
  });

  it("revokes the Session when a credential older than the previous one is replayed, even within the grace window", async () => {
    const first = await refresh();
    const second = await refresh(credentialOf(first));

    const replay = await refresh(credential);

    expect(replay.status).toBe(401);
    expect(replay.body.code).toBe("auth.session_expired");
    expect((await storedSession())?.revokedReason).toBe("reuse-detected");
    const me = await app
      .http()
      .get("/api/users/me")
      .set("Authorization", `Bearer ${second.body.accessToken}`);
    expect(me.status).toBe(401);
  });

  it("refuses a revoked Session with 401 auth.session_expired", async () => {
    await app.db
      .collection("sessions")
      .updateMany({}, { $set: { revokedAt: app.clock.now(), revokedReason: "sign-out" } });

    const response = await refresh();

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("auth.session_expired");
  });

  it("refuses a Session past its 7 day idle expiry", async () => {
    app.clock.advance(7 * DAY + SECOND);

    const response = await refresh();

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("auth.session_expired");
  });

  it("slides the idle expiry 7 days forward on each refresh", async () => {
    app.clock.advance(6 * DAY);
    const first = await refresh().expect(200);
    app.clock.advance(6 * DAY);

    const second = await refresh(credentialOf(first));

    expect(second.status).toBe(200);
    expect((await storedSession())?.idleExpiresAt).toEqual(new Date(app.startedAt.getTime() + 19 * DAY));
  });

  it("never slides the idle expiry past the 30 day absolute cap, and refuses the Session after it", async () => {
    let current = credential;
    for (const day of [6, 12, 18, 24, 29]) {
      app.clock.set(new Date(app.startedAt.getTime() + day * DAY));
      current = credentialOf(await refresh(current).expect(200));
    }
    const cap = new Date(app.startedAt.getTime() + 30 * DAY);
    expect((await storedSession())?.idleExpiresAt).toEqual(cap);
    expect((await storedSession())?.absoluteExpiresAt).toEqual(cap);

    app.clock.set(new Date(cap.getTime() + SECOND));
    const response = await refresh(current);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("auth.session_expired");
  });

  it("gives the cookie a lifetime that ends at the absolute cap near the end of the Session", async () => {
    // As if refreshed throughout: still idle-live on day 29.
    await app.db
      .collection("sessions")
      .updateMany({}, { $set: { idleExpiresAt: new Date(app.startedAt.getTime() + 30 * DAY) } });
    app.clock.set(new Date(app.startedAt.getTime() + 29 * DAY));

    const response = await refresh();

    expect(refreshCookie(response.headers["set-cookie"])).toContain(`Max-Age=${24 * 60 * 60}`);
  });

  it("answers 401 auth.unauthenticated without a refresh cookie", async () => {
    const response = await refresh(null);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("auth.unauthenticated");
  });

  it.each([
    ["is malformed", "not-a-credential"],
    ["names no Session", `${"0".repeat(24)}.c2VjcmV0`],
  ])("answers 401 auth.session_expired when the credential %s", async (_case, presented) => {
    const response = await refresh(presented);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("auth.session_expired");
  });

  describe("the Origin check", () => {
    it("refuses a foreign Origin with 403 auth.origin_rejected, leaving the Session untouched", async () => {
      const response = await refresh().set("Origin", "https://evil.example");

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ code: "auth.origin_rejected", status: 403 });
      expect((await refresh()).status).toBe(200);
    });

    it("accepts a configured front-end Origin", async () => {
      const response = await refresh().set("Origin", frontEnd);

      expect(response.status).toBe(200);
    });

    it("accepts a request without an Origin", async () => {
      const response = await refresh();

      expect(response.status).toBe(200);
    });
  });
});
