import { type AxiosError, type InternalAxiosRequestConfig, isAxiosError } from "axios";
import { apiClient } from "@/utils/api/api-client";
import { apiErrorEnvelope } from "@/utils/api/api-error";
import type { SignedIn } from "@/utils/api/orpc-client";

/** How the Session context refreshes and hears the outcome; it alone writes the access token (ADR 0008). */
export type SessionListener = {
  /** Sends `POST /api/auth/refresh`: the refresh cookie buys a new access token and the User. */
  refresh: () => Promise<SignedIn>;
  restored: (signedIn: SignedIn) => void;
  /** The refresh found no Session, or failed: the Session is over in this tab. */
  ended: () => void;
};

type RetriableConfig = InternalAxiosRequestConfig & { sessionRetried?: boolean };

type InFlight = { owner: SessionListener; attempt: Promise<boolean>; discarded: boolean };

let listener: SessionListener | null = null;
let inFlight: InFlight | null = null;
let stopped = false;

/** Registers the Session context's listener, or removes it with `null`. */
export function listenForSessionChanges(next: SessionListener | null) {
  listener = next;
}

/**
 * Refreshes the Session, sharing one request among every caller while it is in flight. Resolves `true` when the
 * Session was restored. The outcome goes to the listener that started the request, and only while it is still
 * registered: a refresh outliving its app changes nothing, and a new app does not join it. The same listener
 * registering again (StrictMode's second effect run) joins it. With no listener there is no app to restore.
 */
export function refreshSessionOnce(): Promise<boolean> {
  if (stopped || listener === null) return Promise.resolve(false);
  if (inFlight && inFlight.owner === listener) return inFlight.attempt;
  const owner = listener;
  // Read only once the request is answered, after `current` below exists.
  const applies = () => !current.discarded && listener === owner;
  const attempt = owner.refresh().then(
    (signedIn) => {
      if (!applies()) return false;
      owner.restored(signedIn);
      return true;
    },
    () => {
      if (applies()) owner.ended();
      return false;
    },
  );
  const current: InFlight = { owner, attempt, discarded: false };
  inFlight = current;
  void attempt.finally(() => {
    if (inFlight === current) inFlight = null;
  });
  return attempt;
}

/** Sign out began: no refresh restores the Session until `resumeRefreshing()`. */
export function stopRefreshing() {
  // A refresh answered after Sign out began would sign the tab back in, and retry its refused requests, after the
  // User left (ADR 0008).
  stopped = true;
  if (inFlight) inFlight.discarded = true;
  inFlight = null;
}

/** A Session started, or a new app boots: an expired access token may be refreshed again. */
export function resumeRefreshing() {
  stopped = false;
}

/**
 * Whether a refused request is worth a refresh and one more try: its access token expired or was never there
 * (`auth.unauthenticated`), it is not an auth route (refresh among them), and an app is listening for the outcome.
 */
export function refreshesAfterRefusal(code: string | undefined, isAuthRoute: boolean): boolean {
  return listener !== null && !isAuthRoute && code === "auth.unauthenticated";
}

// The same rule for the routes still on axios: refresh once, shared by every request refused meanwhile, then send
// each request again, once.
apiClient.interceptors.response.use(undefined, async (error: unknown) => {
  if (!isAxiosError(error) || !shouldRefresh(error)) throw error;
  const config = error.config as RetriableConfig;
  if (!(await refreshSessionOnce())) throw error;
  config.sessionRetried = true;
  return apiClient.request(config);
});

function shouldRefresh(error: AxiosError): boolean {
  const config = error.config as RetriableConfig | undefined;
  return (
    config !== undefined &&
    !config.sessionRetried &&
    refreshesAfterRefusal(apiErrorEnvelope(error)?.code, config.url?.startsWith("/auth/") ?? false)
  );
}
