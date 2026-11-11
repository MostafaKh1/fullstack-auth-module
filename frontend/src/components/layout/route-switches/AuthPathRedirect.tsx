import { Navigate, useLocation } from "react-router";
import { type AuthForm, withAuthForm } from "@/utils/auth-url/auth-url";

type Props = {
  form: AuthForm;
};

/** Sends an old `/sign-in` or `/sign-up` URL on to its search-parameter URL, keeping `returnTo` (ADR 0009). */
export function AuthPathRedirect({ form }: Props) {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: "/", search: withAuthForm(search, form), hash }} replace />;
}
