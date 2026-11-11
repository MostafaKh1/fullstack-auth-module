import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { PageLoader } from "@/components/utility/PageLoader";
import { useSession } from "@/hooks/useSession";
import { authUrl } from "@/utils/auth-url/auth-url";

type Props = {
  children: ReactNode;
};

/** A signed-out visitor is sent to Sign in, carrying the URL they asked for. */
export function RequireSession({ children }: Props) {
  const { session } = useSession();
  const { pathname, search, hash } = useLocation();

  if (session.status === "restoring") return <PageLoader>Checking your session…</PageLoader>;
  if (session.status === "signed-out") {
    const asked = `${pathname}${search}${hash}`;
    return <Navigate to={authUrl("sign-in", asked === "/" ? undefined : asked)} replace />;
  }
  return children;
}
