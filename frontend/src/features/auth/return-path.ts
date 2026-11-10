import type { Location } from "react-router";

/** Where a guard sends a User once signed in: carried in the router's location state, never in the URL. */
export type ReturnState = { returnTo?: string };

/** The path a signed-out visitor asked for, or the Application page. Only in-app paths are honoured. */
export function returnPath(location: Location): string {
  const returnTo = (location.state as ReturnState | null)?.returnTo;
  return typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//")
    ? returnTo
    : "/";
}
