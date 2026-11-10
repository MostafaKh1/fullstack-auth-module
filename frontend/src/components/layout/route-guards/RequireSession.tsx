import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useSession } from "../../../hooks/useSession";
import type { ReturnState } from "../../composite/auth/AuthScreen/auth-screen-return-path";
import { PageLoader } from "../../utility/PageLoader";

type Props = {
  children: ReactNode;
};

/** Shows `children` only to a signed-in User; sends anyone else to Sign in, carrying the path they asked for. */
export function RequireSession({ children }: Props) {
  const { session } = useSession();
  const location = useLocation();

  if (session.status === "restoring") return <PageLoader>Checking your session…</PageLoader>;
  if (session.status === "signed-out") {
    const state: ReturnState = { returnTo: `${location.pathname}${location.search}${location.hash}` };
    return <Navigate to="/sign-in" replace state={state} />;
  }
  return children;
}
