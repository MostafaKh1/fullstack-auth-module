export function refreshCookie(setCookie: string[] | string | undefined): string {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const cookie = cookies.find((entry) => entry.startsWith("refresh_credential="));
  if (!cookie) throw new Error(`no refresh cookie in ${JSON.stringify(setCookie)}`);
  return cookie;
}
