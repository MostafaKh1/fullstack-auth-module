import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { PageLoader } from "../../components/page-loader";
import { returnPath } from "./return-path";
import { useSession } from "./use-session";

type Props = {
  children: ReactNode;
};

/**
 * Shows `children` (Sign in, Sign up) only while signed out. A signed-in User goes to the Application page,
 * or to the path a guard carried here, so a successful Sign in or Sign up lands there by this guard alone.
 */
export function RequireSignedOut({ children }: Props) {
  const { session } = useSession();
  const location = useLocation();

  if (session.status === "restoring") return <PageLoader>Checking your session…</PageLoader>;
  if (session.status === "signed-in") return <Navigate to={returnPath(location)} replace />;
  return children;
}
