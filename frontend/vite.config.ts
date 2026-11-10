import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // The empty prefix loads unprefixed variables too; API_PROXY_TARGET is read here, never shipped to the browser.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // The browser sees one origin, so the refresh cookie and the Origin check behave as in production.
      proxy: {
        "/api": {
          target: env.API_PROXY_TARGET ?? "http://localhost:3000",
          changeOrigin: false,
        },
      },
    },
  };
});
