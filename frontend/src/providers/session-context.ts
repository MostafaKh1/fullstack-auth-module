import { createContext } from "react";
import type { SignedIn } from "../utils/auth-api";
import type { User } from "../utils/users-api";

/**
 * Whether this browser tab has a Session (ADR 0008). `restoring` lasts while the app asks the back end
 * whether the refresh cookie still holds one; the guards show a loading state until it settles.
 */
export type Session =
  { status: "restoring" } | { status: "signed-out" } | { status: "signed-in"; user: User };

export type SessionContextValue = {
  session: Session;
  /** Starts the Session that a successful Sign up or Sign in returned. */
  startSession: (signedIn: SignedIn) => void;
};

export const SessionContext = createContext<SessionContextValue | null>(null);
