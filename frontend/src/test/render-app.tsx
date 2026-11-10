import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RequestHandler } from "msw";
import { createMemoryRouter } from "react-router";
import { App } from "../app/app";
import { createQueryClient } from "../app/query-client";
import { routes } from "../app/routes";
import { server } from "./server";

type Options = {
  /** The requests this test expects; any other request fails the test. */
  handlers?: RequestHandler[];
};

/** Renders the whole app, with its real router and providers, as if the browser had opened `path`. */
export function renderApp(path: string, { handlers = [] }: Options = {}) {
  server.use(...handlers);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  const view = render(<App router={router} queryClient={createQueryClient({ retry: false })} />);
  return { ...view, router, user };
}
