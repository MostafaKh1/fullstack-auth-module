import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useSession } from "../../../hooks/useSession";
import { signedInDestination } from "../../../utils/auth-url";
import { PageLoader } from "../../utility/PageLoader";

type Props = {
  children: ReactNode;
};

/**
 * Shows `children` (Sign in, Sign up) only while signed out. A signed-in User goes on to the URL's `returnTo` when
 * it is safe, otherwise to the Application page, so a successful Sign in or Sign up lands there by this guard alone.
 */
export function RequireSignedOut({ children }: Props) {
  const { session } = useSession();
  const location = useLocation();

  if (session.status === "restoring") return <PageLoader>Checking your session…</PageLoader>;
  if (session.status === "signed-in") return <Navigate to={signedInDestination(location)} replace />;
  return children;
}
