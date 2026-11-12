import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { type AuthForm, withAuthForm } from "@/features/auth/utils/auth-url";

type Props = {
  to: AuthForm;
  children: ReactNode;
};

/** A link between Sign in and Sign up: it swaps only `auth`, keeps `returnTo`, and replaces the history entry. */
export function AuthScreenSwitchLink({ to, children }: Props) {
  const { search } = useLocation();
  return (
    <Link
      to={{ pathname: "/", search: withAuthForm(search, to) }}
      replace
      className="rounded font-semibold text-primary hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </Link>
  );
}
