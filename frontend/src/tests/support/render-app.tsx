import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RequestHandler } from "msw";
import { StrictMode } from "react";
import { createMemoryRouter } from "react-router";
import { expect } from "vitest";
import { App } from "@/app/App";
import { createQueryClient } from "@/app/query-client";
import { routes } from "@/app/routes";
import { server } from "@/tests/setup/server";
import { noSessionToRestore } from "@/tests/support/auth-fixtures";

type Options = {
  /** Any other request fails the test. The boot restore's `POST /api/auth/refresh` finds no Session unless a handler answers it. */
  handlers?: RequestHandler[];
  /** Render inside React's `StrictMode`, as the browser entry `src/main.tsx` does. */
  strictMode?: boolean;
};

/** Returns at once, while the boot restore is still asking the back end for a Session: for tests of that loading state. */
export function renderRestoringApp(path: string, { handlers = [], strictMode = false }: Options = {}) {
  // Handlers declared first win, so a test's own refresh handler takes precedence over the default.
  server.use(...handlers, noSessionToRestore);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  const app = <App router={router} queryClient={createQueryClient({ retry: false })} />;
  const view = render(strictMode ? <StrictMode>{app}</StrictMode> : app);
  return { ...view, router, user };
}

/** Waits for the boot restore to settle: a page (each has one `<h1>`) is showing. */
export async function renderApp(path: string, options: Options = {}) {
  const rendered = renderRestoringApp(path, options);
  await waitFor(() => {
    expect(screen.queryByText("Checking your session…")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
  return rendered;
}
