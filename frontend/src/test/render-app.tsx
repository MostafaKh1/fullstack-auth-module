import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RequestHandler } from "msw";
import { StrictMode } from "react";
import { createMemoryRouter } from "react-router";
import { expect } from "vitest";
import { App } from "../app/app";
import { createQueryClient } from "../app/query-client";
import { routes } from "../app/routes";
import { noSessionToRestore } from "./auth-fixtures";
import { server } from "./server";

type Options = {
  /**
   * The requests this test expects; any other request fails the test. The boot restore's `POST /api/auth/refresh`
   * finds no Session unless a handler here answers it.
   */
  handlers?: RequestHandler[];
  /** Render inside React's `StrictMode`, as the browser entry `src/main.tsx` does. */
  strictMode?: boolean;
};

/**
 * Renders the whole app, with its real router and providers, as if the browser had opened `path`, and returns at
 * once, while the boot restore is still asking the back end for a Session: for tests of that loading state.
 */
export function renderRestoringApp(path: string, { handlers = [], strictMode = false }: Options = {}) {
  // Handlers declared first win, so a test's own refresh handler takes precedence over the default.
  server.use(...handlers, noSessionToRestore);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  const app = <App router={router} queryClient={createQueryClient({ retry: false })} />;
  const view = render(strictMode ? <StrictMode>{app}</StrictMode> : app);
  return { ...view, router, user };
}

/** `renderRestoringApp`, resolving once the boot restore has settled and a page (each has one `<h1>`) is showing. */
export async function renderApp(path: string, options: Options = {}) {
  const rendered = renderRestoringApp(path, options);
  await waitFor(() => {
    expect(screen.queryByText("Checking your session…")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
  return rendered;
}
