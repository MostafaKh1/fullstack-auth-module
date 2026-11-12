import { createContext } from "react";
import type { SignedIn, User } from "@/utils/api/orpc-client";

/** `restoring` lasts while the app asks the back end whether the refresh cookie still holds a Session (ADR 0008). */
export type Session =
  { status: "restoring" } | { status: "signed-out" } | { status: "signed-in"; user: User };

type SessionContextValue = {
  session: Session;
  startSession: (signedIn: SignedIn) => void;
  /** Ends the Session in this tab whether or not the back end call succeeded (ADR 0008). Never rejects. */
  endSession: () => Promise<void>;
};

export const SessionContext = createContext<SessionContextValue | null>(null);
