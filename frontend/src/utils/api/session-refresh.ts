import { type AxiosError, type InternalAxiosRequestConfig, isAxiosError } from "axios";
import { apiClient } from "@/utils/api/api-client";
import { apiErrorEnvelope } from "@/utils/api/api-error";
import { refreshSession, type SignedIn } from "@/utils/api/auth-api";

/** How a refresh's outcome reaches the Session context, which alone writes the access token (ADR 0008). */
export type SessionListener = {
  restored: (signedIn: SignedIn) => void;
  /** The refresh found no Session, or failed: the Session is over in this tab. */
  ended: () => void;
};

type RetriableConfig = InternalAxiosRequestConfig & { sessionRetried?: boolean };

let listener: SessionListener | null = null;
type InFlight = { owner: SessionListener | null; attempt: Promise<boolean>; discarded: boolean };

let inFlight: InFlight | null = null;

/** Registers the Session context's listener, or removes it with `null`. */
export function listenForSessionChanges(next: SessionListener | null) {
  listener = next;
}

/**
 * Refreshes the Session, sharing one request among every caller while it is in flight. Resolves `true` when the
 * Session was restored. The outcome goes to the listener that started the request, and only while it is still
 * registered and the refresh was not discarded: a refresh outliving its app or its Session changes nothing, and a
 * new app does not join it. The same listener registering again (StrictMode's second effect run) joins it.
 */
export function refreshSessionOnce(): Promise<boolean> {
  if (inFlight && inFlight.owner === listener) return inFlight.attempt;
  const owner = listener;
  const current: InFlight = { owner, attempt: Promise.resolve(false), discarded: false };
  const applies = () => !current.discarded && listener === owner;
  const attempt = refreshSession().then(
    (signedIn) => {
      if (!applies()) return false;
      owner?.restored(signedIn);
      return true;
    },
    () => {
      if (applies()) owner?.ended();
      return false;
    },
  );
  current.attempt = attempt;
  inFlight = current;
  void attempt.finally(() => {
    if (inFlight === current) inFlight = null;
  });
  return attempt;
}

/**
 * Sign out began: the refresh in flight restores nothing when it is answered, and no request it would have
 * retried is sent again, since its answer could sign the tab back in after the User left.
 */
export function discardRefreshInFlight() {
  if (inFlight) inFlight.discarded = true;
  inFlight = null;
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
