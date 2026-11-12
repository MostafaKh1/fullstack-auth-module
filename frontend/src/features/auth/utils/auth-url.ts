import { isSafeReturnTo } from "@/features/auth/utils/return-to";

/** The forms the `auth` search parameter on `/` addresses (ADR 0009), named as in GLOSSARY.md. */
export type AuthForm = "sign-in" | "sign-up";

/** The form `search` asks for: `null` when it has no `auth`, Sign in for any value but `sign-up`. */
export function authFormIn(search: string): AuthForm | null {
  const auth = new URLSearchParams(search).get("auth");
  if (auth === null) return null;
  return auth === "sign-up" ? "sign-up" : "sign-in";
}

export function authUrl(form: AuthForm, returnTo?: string): string {
  const params = new URLSearchParams({ auth: form });
  if (returnTo !== undefined) params.set("returnTo", returnTo);
  return `/?${params}`;
}

/** `search` addressing `form`: `auth` swapped in place, or put first; every other parameter (`returnTo`) kept. */
export function withAuthForm(search: string, form: AuthForm): string {
  const params = new URLSearchParams(search);
  if (params.has("auth")) {
    params.set("auth", form);
    return `?${params}`;
  }
  return `?${new URLSearchParams([["auth", form], ...params])}`;
}

export function signedInDestination({ search, hash }: { search: string; hash: string }): string {
  const params = new URLSearchParams(search);
  const returnTo = params.get("returnTo");
  if (returnTo !== null && isSafeReturnTo(returnTo)) return returnTo;
  params.delete("auth");
  params.delete("returnTo");
  const rest = params.toString();
  return `/${rest ? `?${rest}` : ""}${hash}`;
}
