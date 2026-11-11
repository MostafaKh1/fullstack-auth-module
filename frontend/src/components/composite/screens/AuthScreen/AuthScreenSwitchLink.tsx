import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { type AuthForm, withAuthForm } from "@/utils/auth-url/auth-url";

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
      className="rounded font-semibold text-indigo-600 hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
    >
      {children}
    </Link>
  );
}
