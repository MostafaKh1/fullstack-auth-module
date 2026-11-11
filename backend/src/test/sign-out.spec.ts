import { refreshCookie } from "@/test/support/refresh-cookie";
import { startTestApp, type TestApp } from "./boot";

const ada = { email: "ada@example.com", name: "Ada Lovelace", password: "Passw0rd!" };

const SECOND = 1000;
const frontEnd = "http://localhost:5173";

type SignedIn = { credential: string; accessToken: string; sessionId: string };

function credentialOf(response: { headers: Record<string, unknown> }): string {
  const cookie = refreshCookie(response.headers["set-cookie"] as string[] | undefined);
  return decodeURIComponent(cookie.split(/[=;]/)[1]);
}

function signedInFrom(response: {
  headers: Record<string, unknown>;
  body: { accessToken: string };
}): SignedIn {
  const credential = credentialOf(response);
  return { credential, accessToken: response.body.accessToken, sessionId: credential.split(".")[0] };
}

describe("Sign out: POST /api/auth/sign-out", () => {
  let app: TestApp;
  let device: SignedIn;

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
    device = signedInFrom(await app.http().post("/api/auth/sign-up").send(ada).expect(201));
  });

  function withCookie(path: string, presented: string | null) {
    const request = app.http().post(path);
    if (presented !== null) request.set("Cookie", `refresh_credential=${encodeURIComponent(presented)}`);
    return request;
  }

  const signOut = (presented: string | null = device.credential) =>
    withCookie("/api/auth/sign-out", presented);
  const refresh = (presented: string) => withCookie("/api/auth/refresh", presented);
  const currentUser = (accessToken: string) =>
    app.http().get("/api/users/me").set("Authorization", `Bearer ${accessToken}`);

  async function storedSession(sessionId: string) {
    const sessions = await app.db.collection("sessions").find({}).toArray();
    return sessions.find((session) => session._id.toString() === sessionId);
  }

  function expectCookieCleared(response: { headers: Record<string, unknown> }) {
    const cookie = refreshCookie(response.headers["set-cookie"] as string[] | undefined);
    expect(cookie).toMatch(/^refresh_credential=;/);
    expect(cookie).toContain("Path=/api/auth");
    expect(cookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(cookie).toContain("HttpOnly");
  }

  it("revokes the current Session as sign-out, clears the cookie and answers 204", async () => {
    app.clock.advance(5 * SECOND);

    const response = await signOut();

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expectCookieCleared(response);
    const session = await storedSession(device.sessionId);
    expect(session?.revokedReason).toBe("sign-out");
    expect(session?.revokedAt).toEqual(new Date(app.startedAt.getTime() + 5 * SECOND));
  });

  it("refuses the revoked Session's access token on the protected endpoint at once", async () => {
    expect((await currentUser(device.accessToken)).status).toBe(200);

    await signOut().expect(204);

    const me = await currentUser(device.accessToken);
    expect(me.status).toBe(401);
    expect(me.body.code).toBe("auth.unauthenticated");
  });

  it("leaves the revoked Session's refresh credential unable to refresh", async () => {
    await signOut().expect(204);

    const response = await refresh(device.credential);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("auth.session_expired");
  });

  it("leaves another Session of the same User working", async () => {
    const other = signedInFrom(
      await app
        .http()
        .post("/api/auth/sign-in")
        .send({ email: ada.email, password: ada.password })
        .expect(200),
    );

    await signOut().expect(204);

    expect((await currentUser(other.accessToken)).status).toBe(200);
    expect((await refresh(other.credential)).status).toBe(200);
    expect((await storedSession(other.sessionId))?.revokedAt).toBeNull();
  });

  it("is idempotent: signing out again answers 204 and keeps the first revocation", async () => {
    await signOut().expect(204);
    const revokedAt = (await storedSession(device.sessionId))?.revokedAt;
    app.clock.advance(60 * SECOND);

    const again = await signOut();

    expect(again.status).toBe(204);
    expectCookieCleared(again);
    expect((await storedSession(device.sessionId))?.revokedAt).toEqual(revokedAt);
  });

  it.each([
    ["no refresh cookie", null],
    ["a malformed credential", "not-a-credential"],
    ["a credential naming no Session", `${"0".repeat(24)}.c2VjcmV0`],
  ])("answers 204 and clears the cookie with %s", async (_case, presented) => {
    const response = await signOut(presented);

    expect(response.status).toBe(204);
    expectCookieCleared(response);
    expect((await storedSession(device.sessionId))?.revokedAt).toBeNull();
  });

  it("does not revoke a Session when the credential's secret is not the Session's", async () => {
    const response = await signOut(`${device.sessionId}.bm90LXRoZS1zZWNyZXQ`);

    expect(response.status).toBe(204);
    expect((await storedSession(device.sessionId))?.revokedAt).toBeNull();
    expect((await currentUser(device.accessToken)).status).toBe(200);
  });

  it("does not need an access token", async () => {
    const response = await signOut().set("Authorization", "Bearer not-a-token");

    expect(response.status).toBe(204);
  });

  describe("racing a refresh", () => {
    it("ends the Session when Sign out carries the secret a refresh replaced moments before", async () => {
      // The browser sent Sign out with its cookie before applying the cookie the refresh's response set.
      const rotated = credentialOf(await refresh(device.credential).expect(200));
      app.clock.advance(5 * SECOND);

      const response = await signOut(device.credential);

      expect(response.status).toBe(204);
      expectCookieCleared(response);
      expect((await storedSession(device.sessionId))?.revokedReason).toBe("sign-out");
      expect((await refresh(rotated)).status).toBe(401);
      expect((await currentUser(device.accessToken)).status).toBe(401);
    });

    it("ends the Session whichever of a concurrent refresh and Sign out is handled first", async () => {
      const [, signedOut] = await Promise.all([refresh(device.credential), signOut(device.credential)]);

      expect(signedOut.status).toBe(204);
      expect((await storedSession(device.sessionId))?.revokedReason).toBe("sign-out");
      expect((await currentUser(device.accessToken)).status).toBe(401);
    });
  });

  describe("the Origin check", () => {
    it("refuses a foreign Origin with 403 auth.origin_rejected, leaving the Session live", async () => {
      const response = await signOut().set("Origin", "https://evil.example");

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ code: "auth.origin_rejected", status: 403 });
      expect(response.headers["set-cookie"]).toBeUndefined();
      expect((await storedSession(device.sessionId))?.revokedAt).toBeNull();
    });

    it("accepts a configured front-end Origin", async () => {
      const response = await signOut().set("Origin", frontEnd);

      expect(response.status).toBe(204);
      expect((await storedSession(device.sessionId))?.revokedReason).toBe("sign-out");
    });
  });
});
