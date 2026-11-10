import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";

type Props = {
  to: "/sign-in" | "/sign-up";
  children: ReactNode;
};

/** A link between Sign in and Sign up that keeps the path a guard is carrying back to. */
export function AuthScreenSwitchLink({ to, children }: Props) {
  const location = useLocation();
  return (
    <Link
      to={to}
      state={location.state}
      className="rounded font-semibold text-indigo-600 hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
    >
      {children}
    </Link>
  );
}
