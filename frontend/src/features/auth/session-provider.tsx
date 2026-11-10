import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import type { SignedIn } from "../../api/auth";
import { setAccessToken } from "../../api/client";
import { listenForSessionChanges, refreshSessionOnce, type SessionListener } from "../../api/session-refresh";
import { type Session, SessionContext } from "./session-context";

type Props = {
  children: ReactNode;
};

/**
 * Holds the Session for the whole app; the access token goes to the API client's memory and nowhere else.
 * A tab boots `restoring` and asks the back end, through the refresh cookie, whether it still has a Session.
 */
export function SessionProvider({ children }: Props) {
  const [session, setSession] = useState<Session>({ status: "restoring" });

  const startSession = useCallback((signedIn: SignedIn) => {
    setAccessToken(signedIn.accessToken);
    setSession({ status: "signed-in", user: signedIn.user });
  }, []);

  // One listener for the provider's lifetime: StrictMode's second effect run then joins the boot refresh
  // the first run started instead of sending another.
  const [listener] = useState<SessionListener>(() => ({
    restored: startSession,
    ended: () => {
      setAccessToken(null);
      setSession({ status: "signed-out" });
    },
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

  const value = useMemo(() => ({ session, startSession }), [session, startSession]);
  return <SessionContext value={value}>{children}</SessionContext>;
}
