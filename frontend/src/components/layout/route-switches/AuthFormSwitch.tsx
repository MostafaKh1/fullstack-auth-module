import type { ReactNode } from "react";
import { useLocation } from "react-router";
import { authFormIn } from "../../../utils/auth-url";

type Props = {
  /** Shown for `?auth=sign-in` and for any `auth` value it does not know. */
  signIn: ReactNode;
  /** Shown for `?auth=sign-up`. */
  signUp: ReactNode;
  /** Shown when the URL has no `auth`. */
  children: ReactNode;
};

/** Picks what `/` shows by its `auth` search parameter: Sign in, Sign up, or `children` (ADR 0009). */
export function AuthFormSwitch({ signIn, signUp, children }: Props) {
  const form = authFormIn(useLocation().search);
  if (form === null) return children;
  return form === "sign-up" ? signUp : signIn;
}
