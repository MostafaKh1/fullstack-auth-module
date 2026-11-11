import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { type Session, SessionContext } from "@/providers/session-context";
import { setAccessToken } from "@/utils/api/api-client";
import { type SignedIn, signOut } from "@/utils/api/auth-api";
import {
  discardRefreshInFlight,
  listenForSessionChanges,
  refreshSessionOnce,
  type SessionListener,
} from "@/utils/api/session-refresh";

type Props = {
  children: ReactNode;
};

/** The access token goes to the API client's memory and nowhere else (ADR 0008). */
export function SessionProvider({ children }: Props) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session>({ status: "restoring" });

  const startSession = useCallback((signedIn: SignedIn) => {
    setAccessToken(signedIn.accessToken);
    setSession({ status: "signed-in", user: signedIn.user });
  }, []);

  // Nothing fetched for this User may outlive their Session.
  const endLocally = useCallback(() => {
    setAccessToken(null);
    queryClient.clear();
    setSession({ status: "signed-out" });
  }, [queryClient]);

  const endSession = useCallback(async () => {
    discardRefreshInFlight();
    try {
      await signOut();
    } catch {
      // The tab is signed out anyway: the User asked to leave, and a failed request is not a reason to stay (ADR 0008).
    }
    endLocally();
  }, [endLocally]);

  // One listener for the provider's lifetime: StrictMode's second effect run then joins the boot refresh
  // the first run started instead of sending another.
  const [listener] = useState<SessionListener>(() => ({
    restored: startSession,
    ended: endLocally,
  }));

  useEffect(() => {
    listenForSessionChanges(listener);
    void refreshSessionOnce();
    // Unmounting ends the app, so its token goes with it.
    return () => {
      listenForSessionChanges(null);
      setAccessToken(null);
    };
  }, [listener]);

  const value = useMemo(() => ({ session, startSession, endSession }), [session, startSession, endSession]);
  return <SessionContext value={value}>{children}</SessionContext>;
}
