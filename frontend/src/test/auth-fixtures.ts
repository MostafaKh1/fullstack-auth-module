import { delay, HttpResponse, http } from "msw";

/** A User as the API returns it (`/users/me`, and `user` in an auth response). */
export const ada = {
  id: "65f1c0ffee0000000000a11a",
  email: "ada@example.com",
  name: "Ada Lovelace",
  createdAt: "2026-01-01T00:00:00.000Z",
};

export const adaPassword = "Passw0rd!";

export const accessToken = "access-token-for-ada";

/** The success answer of Sign up (201) and Sign in (200). */
export function signedInAsAda(status = 200) {
  return HttpResponse.json({ accessToken, expiresIn: 900, user: ada }, { status });
}

/** An error response in the envelope of ADR 0002. */
export function envelope(
  code: string,
  status: number,
  extra: { issues?: { path: string; code: string }[]; message?: string } = {},
) {
  return HttpResponse.json(
    { code, status, traceId: "trace-1", retryable: status >= 500 || status === 429, ...extra },
    { status },
  );
}

export const signUpSucceeds = http.post("/api/auth/sign-up", () => signedInAsAda(201));

export const signInSucceeds = http.post("/api/auth/sign-in", () => signedInAsAda());

/** `GET /api/users/me`: Ada for her access token, `401 auth.unauthenticated` for anything else. */
export const currentUserIsAda = http.get("/api/users/me", ({ request }) =>
  request.headers.get("Authorization") === `Bearer ${accessToken}`
    ? HttpResponse.json(ada)
    : envelope("auth.unauthenticated", 401),
);

/** A handler that holds its request until `release()` is called, to observe the in-flight state. */
export function heldUntilReleased(method: "post" | "get", path: string, answer: () => Response) {
  let release: () => void = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const handler = http[method](path, async () => {
    await released;
    await delay(0);
    return answer();
  });
  return { handler, release: () => release() };
}
