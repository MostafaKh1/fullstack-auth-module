import type { RouteObject } from "react-router";
import { RequireSession } from "../components/layout/route-guards/RequireSession";
import { RequireSignedOut } from "../components/layout/route-guards/RequireSignedOut";
import { AuthFormSwitch } from "../components/layout/route-switches/AuthFormSwitch";
import { AuthPathRedirect } from "../components/layout/route-switches/AuthPathRedirect";
import { SignInPage } from "../pages/(auth)/sign-in/SignInPage";
import { SignUpPage } from "../pages/(auth)/sign-up/SignUpPage";
import { ApplicationPage } from "../pages/(webapp)/application/ApplicationPage";
import { NotFoundPage } from "../pages/not-found/NotFoundPage";

/**
 * The one route table, shared by the browser router and the test harness. Sign in and Sign up are addressed by
 * the `auth` search parameter on `/`, not by paths of their own (ADR 0009).
 */
export const routes: RouteObject[] = [
  {
    path: "/",
    element: (
      <AuthFormSwitch
        signIn={
          <RequireSignedOut>
            <SignInPage />
          </RequireSignedOut>
        }
        signUp={
          <RequireSignedOut>
            <SignUpPage />
          </RequireSignedOut>
        }
      >
        <RequireSession>
          <ApplicationPage />
        </RequireSession>
      </AuthFormSwitch>
    ),
  },
  { path: "/sign-in", element: <AuthPathRedirect form="sign-in" /> },
  { path: "/sign-up", element: <AuthPathRedirect form="sign-up" /> },
  { path: "*", element: <NotFoundPage /> },
];
