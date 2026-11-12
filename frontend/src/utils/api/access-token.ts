// The access token lives only in this module's memory, never in storage a script could read across reloads
// (ADR 0008). The Session context is the only caller of `setAccessToken`.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** Read by the oRPC client when it attaches the Bearer header. */
export function currentAccessToken(): string | null {
  return accessToken;
}
