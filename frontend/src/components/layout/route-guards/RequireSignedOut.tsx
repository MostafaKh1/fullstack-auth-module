import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { PageLoader } from "@/components/utility/PageLoader";
import { useSession } from "@/hooks/useSession";
import { signedInDestination } from "@/utils/auth-url";

type Props = {
  children: ReactNode;
};

/**
 * The forms never navigate after a successful Sign in or Sign up: this guard sends the signed-in User on to a
 * safe `returnTo`, otherwise to the Application page (ADR 0009).
 */
export function RequireSignedOut({ children }: Props) {
  const { session } = useSession();
  const location = useLocation();

  if (session.status === "restoring") return <PageLoader>Checking your session…</PageLoader>;
  if (session.status === "signed-in") return <Navigate to={signedInDestination(location)} replace />;
  return children;
}
