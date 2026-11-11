import axios from "axios";

/** In development Vite proxies `/api` to the back end, so the browser sees one origin. */
export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// The access token lives only in this module's memory, never in storage a script could read across reloads
// (ADR 0008). The Session context is the only caller of `setAccessToken`.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.set("Authorization", `Bearer ${accessToken}`);
  return config;
});
