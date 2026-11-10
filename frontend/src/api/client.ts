import axios from "axios";

/** The one HTTP client. In development Vite proxies `/api` to the back end, so the browser sees one origin. */
export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
});
