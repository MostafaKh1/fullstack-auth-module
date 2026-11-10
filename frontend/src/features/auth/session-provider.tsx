import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import type { SignedIn } from "../../api/auth";
import { setAccessToken } from "../../api/client";
import { type Session, SessionContext } from "./session-context";

type Props = {
  children: ReactNode;
};

/** Holds the Session for the whole app; the access token goes to the API client's memory and nowhere else. */
export function SessionProvider({ children }: Props) {
  // A tab starts signed out: nothing restores a Session from the refresh cookie on boot yet.
  const [session, setSession] = useState<Session>({ status: "signed-out" });

  const startSession = useCallback((signedIn: SignedIn) => {
    setAccessToken(signedIn.accessToken);
    setSession({ status: "signed-in", user: signedIn.user });
  }, []);

  // Unmounting ends the app, so its token goes with it.
  useEffect(() => () => setAccessToken(null), []);

  const value = useMemo(() => ({ session, startSession }), [session, startSession]);
  return <SessionContext value={value}>{children}</SessionContext>;
}
