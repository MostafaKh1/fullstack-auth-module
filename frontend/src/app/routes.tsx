import type { RouteObject } from "react-router";
import { RequireSession } from "@/features/auth/components/layout/route-guards/RequireSession";
import { RequireSignedOut } from "@/features/auth/components/layout/route-guards/RequireSignedOut";
import { AuthFormSwitch } from "@/features/auth/components/layout/route-switches/AuthFormSwitch";
import { AuthPathRedirect } from "@/features/auth/components/layout/route-switches/AuthPathRedirect";
import { SignInPage } from "@/pages/(auth)/sign-in/SignInPage";
import { SignUpPage } from "@/pages/(auth)/sign-up/SignUpPage";
import { ApplicationPage } from "@/pages/(webapp)/application/ApplicationPage";
import { NotFoundPage } from "@/pages/not-found/NotFoundPage";

/** Shared by the browser router and the test harness. Sign in and Sign up have no paths of their own (ADR 0009). */
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
