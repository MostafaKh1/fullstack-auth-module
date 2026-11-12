const sameSite = "https://same-site.invalid";

/**
 * Whether `returnTo` may be followed after Sign in or Sign up (ADR 0009). It comes from the URL, so anyone can
 * write it: following it unchecked would be an open redirect, sending a User who just signed in to a look-alike
 * site. Only a same-site path that is not itself an auth URL is safe. The worked examples are `return-to.examples.ts`.
 */
export function isSafeReturnTo(returnTo: string): boolean {
  if (!returnTo.startsWith("/") || returnTo.startsWith("//") || returnTo.startsWith("/\\")) return false;
  let url: URL;
  try {
    // Resolved as the browser would, which also catches the forms a prefix check misses (`/\t/evil.example`).
    url = new URL(returnTo, sameSite);
  } catch {
    return false;
  }
  return url.origin === sameSite && !url.searchParams.has("auth");
}
