import { startTestApp, type TestApp } from "./boot";

function signInFrom(app: TestApp, clientIp: string) {
  return app
    .http()
    .post("/api/auth/sign-in")
    .set("X-Forwarded-For", clientIp)
    .send({ email: "a@b.co", password: "x" });
}

describe("throttling behind a reverse proxy", () => {
  it("gives each client its own bucket when one proxy is trusted", async () => {
    const app = await startTestApp({ THROTTLE_LIMIT: "2", TRUST_PROXY: "1" });
    try {
      expect((await signInFrom(app, "203.0.113.1")).status).toBe(401);
      expect((await signInFrom(app, "203.0.113.1")).status).toBe(401);
      expect((await signInFrom(app, "203.0.113.1")).status).toBe(429);

      expect((await signInFrom(app, "203.0.113.2")).status).toBe(401);
    } finally {
      await app.close();
    }
  });

  it("shares one bucket, whatever X-Forwarded-For says, when no proxy is trusted", async () => {
    const app = await startTestApp({ THROTTLE_LIMIT: "2" });
    try {
      expect((await signInFrom(app, "203.0.113.1")).status).toBe(401);
      expect((await signInFrom(app, "203.0.113.2")).status).toBe(401);
      expect((await signInFrom(app, "203.0.113.3")).status).toBe(429);
    } finally {
      await app.close();
    }
  });
});
