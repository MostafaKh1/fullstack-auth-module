import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useSession } from "../../../hooks/useSession";
import { signedInDestination } from "../../../utils/auth-url";
import { PageLoader } from "../../utility/PageLoader";

type Props = {
  children: ReactNode;
};

/**
 * A successful Sign in or Sign up lands where it should by this guard alone: a signed-in User goes on to a safe
 * `returnTo`, otherwise to the Application page.
 */
export function RequireSignedOut({ children }: Props) {
  const { session } = useSession();
  const location = useLocation();

  if (session.status === "restoring") return <PageLoader>Checking your session…</PageLoader>;
  if (session.status === "signed-in") return <Navigate to={signedInDestination(location)} replace />;
  return children;
}
