import type { ReactNode } from "react";
import { useLocation } from "react-router";
import { authFormIn } from "@/utils/auth-url/auth-url";

type Props = {
  /** Shown for `?auth=sign-in` and for any `auth` value it does not know. */
  signIn: ReactNode;
  signUp: ReactNode;
  /** Shown when the URL has no `auth`. */
  children: ReactNode;
};

/** Addressed by the `auth` search parameter, not by paths (ADR 0009). */
export function AuthFormSwitch({ signIn, signUp, children }: Props) {
  const form = authFormIn(useLocation().search);
  if (form === null) return children;
  return form === "sign-up" ? signUp : signIn;
}
