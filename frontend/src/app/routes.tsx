import type { RouteObject } from "react-router";
import { RequireSession } from "../features/auth/require-session";
import { RequireSignedOut } from "../features/auth/require-signed-out";
import { ApplicationPage } from "../pages/application-page";
import { NotFoundPage } from "../pages/not-found-page";
import { SignInPage } from "../pages/sign-in-page";
import { SignUpPage } from "../pages/sign-up-page";

/** The one route table, shared by the browser router and the test harness. */
export const routes: RouteObject[] = [
  {
    path: "/",
    element: (
      <RequireSession>
        <ApplicationPage />
      </RequireSession>
    ),
  },
  {
    path: "/sign-in",
    element: (
      <RequireSignedOut>
        <SignInPage />
      </RequireSignedOut>
    ),
  },
  {
    path: "/sign-up",
    element: (
      <RequireSignedOut>
        <SignUpPage />
      </RequireSignedOut>
    ),
  },
  { path: "*", element: <NotFoundPage /> },
];
