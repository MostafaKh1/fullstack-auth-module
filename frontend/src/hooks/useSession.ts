import { use } from "react";
import { SessionContext } from "../providers/session-context";

export function useSession() {
  const value = use(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
