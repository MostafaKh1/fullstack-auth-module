import { type AxiosError, type InternalAxiosRequestConfig, isAxiosError } from "axios";
import { apiClient } from "./api-client";
import { apiErrorEnvelope } from "./api-error";
import { refreshSession, type SignedIn } from "./auth-api";

/**
 * How a refresh's outcome reaches the Session context, which alone writes the access token (ADR 0008).
 * The provider registers one with `listenForSessionChanges`.
 */
export type SessionListener = {
  /** The refresh cookie still held a Session: here is its new access token and the User. */
  restored: (signedIn: SignedIn) => void;
  /** It did not, or the refresh failed: the Session is over in this tab. */
  ended: () => void;
};

type RetriableConfig = InternalAxiosRequestConfig & { sessionRetried?: boolean };

let listener: SessionListener | null = null;
let inFlight: { owner: SessionListener | null; attempt: Promise<boolean> } | null = null;

/** Registers the Session context's listener, or removes it with `null`. */
export function listenForSessionChanges(next: SessionListener | null) {
  listener = next;
}

/**
 * Refreshes the Session, sharing one request among every caller while it is in flight. Resolves `true` when the
 * Session was restored. The outcome goes to the listener that started the request, and only while it is still
 * registered: a refresh outliving its app changes nothing, and a new app does not join it. The same listener
 * registering again (StrictMode's second effect run) joins it.
 */
export function refreshSessionOnce(): Promise<boolean> {
  if (inFlight && inFlight.owner === listener) return inFlight.attempt;
  const owner = listener;
  const attempt = refreshSession().then(
    (signedIn) => {
      if (listener === owner) owner?.restored(signedIn);
      return true;
    },
    () => {
      if (listener === owner) owner?.ended();
      return false;
    },
  );
  const current = { owner, attempt };
  inFlight = current;
  void attempt.finally(() => {
    if (inFlight === current) inFlight = null;
  });
  return attempt;
}

// A `401 auth.unauthenticated` means the access token expired or was never there: refresh once, shared by every
// request refused meanwhile, then send each request again, once. The auth routes are left alone, refresh among them.
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
    listener !== null &&
    config !== undefined &&
    !config.sessionRetried &&
    !config.url?.startsWith("/auth/") &&
    apiErrorEnvelope(error)?.code === "auth.unauthenticated"
  );
}
