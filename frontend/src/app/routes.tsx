import type { RouteObject } from "react-router";
import { RequireSession } from "../components/layout/route-guards/RequireSession";
import { RequireSignedOut } from "../components/layout/route-guards/RequireSignedOut";
import { SignInPage } from "../pages/(auth)/sign-in/SignInPage";
import { SignUpPage } from "../pages/(auth)/sign-up/SignUpPage";
import { ApplicationPage } from "../pages/(webapp)/application/ApplicationPage";
import { NotFoundPage } from "../pages/not-found/NotFoundPage";

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
