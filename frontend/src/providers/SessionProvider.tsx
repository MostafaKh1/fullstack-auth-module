import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { setAccessToken } from "../utils/api-client";
import { type SignedIn, signOut } from "../utils/auth-api";
import { listenForSessionChanges, refreshSessionOnce, type SessionListener } from "../utils/session-refresh";
import { type Session, SessionContext } from "./session-context";

type Props = {
  children: ReactNode;
};

/**
 * Holds the Session for the whole app; the access token goes to the API client's memory and nowhere else.
 * A tab boots `restoring` and asks the back end, through the refresh cookie, whether it still has a Session.
 */
export function SessionProvider({ children }: Props) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session>({ status: "restoring" });

  const startSession = useCallback((signedIn: SignedIn) => {
    setAccessToken(signedIn.accessToken);
    setSession({ status: "signed-in", user: signedIn.user });
  }, []);

  // The Session is over in this tab: forget its token and everything fetched for its User.
  const endLocally = useCallback(() => {
    setAccessToken(null);
    queryClient.clear();
    setSession({ status: "signed-out" });
  }, [queryClient]);

  const endSession = useCallback(async () => {
    try {
      await signOut();
    } catch {
      // The tab is signed out anyway: the User asked to leave, and a failed request is not a reason to stay.
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
