/**
 * The worked examples of the `returnTo` safety rule (`isSafeReturnTo` in `return-to.ts`, ADR 0009), one row per
 * case. The page tests run every row through a Sign in: a safe row lands on `returnTo`, an unsafe one on `/`.
 */
export type ReturnToExample = {
  returnTo: string;
  safe: boolean;
  note: string;
};

export const returnToExamples: ReturnToExample[] = [
  { returnTo: "/", safe: true, note: "the Application page" },
  { returnTo: "/?from=bookmark", safe: true, note: "a path with a query" },
  { returnTo: "/?from=bookmark#top", safe: true, note: "a path with a query and a hash" },
  { returnTo: "/no-such-page", safe: true, note: "any same-site path, even one with no route" },
  { returnTo: "/?next=%2F%2Fevil.example", safe: true, note: "another URL inside the query is only data" },
  { returnTo: "//evil.example", safe: false, note: "a protocol-relative URL names another host" },
  { returnTo: "https://evil.example", safe: false, note: "an absolute URL" },
  { returnTo: "/\\evil.example", safe: false, note: "a browser reads the backslash as a slash" },
  { returnTo: "javascript:alert(1)", safe: false, note: "a script URL" },
  { returnTo: "/?auth=sign-in", safe: false, note: "an auth URL would show a form to a signed-in User" },
  { returnTo: "/?from=bookmark&auth=sign-up", safe: false, note: "an auth URL, auth not first" },
  { returnTo: "/\t/evil.example", safe: false, note: "the URL parser drops the tab, leaving //evil.example" },
  { returnTo: "evil.example", safe: false, note: "a relative path does not start with /" },
  { returnTo: "", safe: false, note: "empty" },
];
