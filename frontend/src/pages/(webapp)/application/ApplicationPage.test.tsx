import { act, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import {
  accessToken,
  ada,
  adaPassword,
  currentUserIsAda,
  envelope,
  heldUntilReleased,
  refreshAnswersAda,
  refreshedAccessToken,
  signedInAsAda,
  signInSucceeds,
  signUpSucceeds,
} from "../../../tests/support/auth-fixtures";
import { expectedCopy } from "../../../tests/support/expected-copy";
import { fillForm } from "../../../tests/support/fill-form";
import { renderApp, renderRestoringApp } from "../../../tests/support/render-app";
import { getCurrentUser } from "../../../utils/users-api";

async function signInThroughTheForm(user: Awaited<ReturnType<typeof renderApp>>["user"]) {
  await fillForm(user, { Email: ada.email, Password: adaPassword });
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("Application page", () => {
  it("welcomes the signed-in User with the exact heading and their name from the protected endpoint", async () => {
    const { user } = await renderApp("/sign-up", { handlers: [signUpSucceeds, currentUserIsAda] });

    await fillForm(user, { Email: ada.email, Name: ada.name, Password: adaPassword });
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      /^Welcome to the application\.$/,
    );
    // currentUserIsAda answers only a request bearing the access token from the Sign up response.
    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
  });

  it("shows a readable message when the protected endpoint fails", async () => {
    const { user } = await renderApp("/sign-in", {
      handlers: [signInSucceeds, http.get("/api/users/me", () => envelope("server.internal", 500))],
    });

    await signInThroughTheForm(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(expectedCopy["server.internal"] as string);
    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome to the application." }),
    ).toBeInTheDocument();
  });

  it("sends a signed-out visitor to Sign in, then back to the page they asked for once signed in", async () => {
    const { user, router } = await renderApp("/?from=bookmark#top", {
      handlers: [signInSucceeds, currentUserIsAda],
    });

    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/sign-in");

    await signInThroughTheForm(user);

    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
    expect(router.state.location).toMatchObject({ pathname: "/", search: "?from=bookmark", hash: "#top" });
  });

  it("keeps the return path when the visitor switches from Sign in to Sign up", async () => {
    const { user, router } = await renderApp("/?from=bookmark", {
      handlers: [signUpSucceeds, currentUserIsAda],
    });

    await user.click(screen.getByRole("link", { name: "Sign up" }));
    await fillForm(user, { Email: ada.email, Name: ada.name, Password: adaPassword });
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
    expect(router.state.location).toMatchObject({ pathname: "/", search: "?from=bookmark" });
  });

  it.each(["/sign-in", "/sign-up"])(
    "sends a signed-in User who opens %s to the Application page",
    async (path) => {
      const { user, router } = await renderApp("/sign-in", { handlers: [signInSucceeds, currentUserIsAda] });
      await signInThroughTheForm(user);
      await screen.findByText("Signed in as Ada Lovelace");

      await act(() => router.navigate(path));

      expect(router.state.location.pathname).toBe("/");
      expect(
        screen.getByRole("heading", { level: 1, name: "Welcome to the application." }),
      ).toBeInTheDocument();
    },
  );
});

describe("the Session survives reloads", () => {
  /** `/users/me` answering Ada only for `token`, `401 auth.unauthenticated` otherwise, recording each token sent. */
  function currentUserIsAdaWith(token: string) {
    const seen: (string | null)[] = [];
    const handler = http.get("/api/users/me", ({ request }) => {
      const authorization = request.headers.get("Authorization");
      seen.push(authorization);
      return authorization === `Bearer ${token}`
        ? HttpResponse.json(ada)
        : envelope("auth.unauthenticated", 401);
    });
    return { handler, seen };
  }

  /** Every path the router has shown, from the first render on. */
  function visitedPaths(router: ReturnType<typeof renderRestoringApp>["router"]) {
    const paths = [router.state.location.pathname];
    router.subscribe((state) => paths.push(state.location.pathname));
    return paths;
  }

  it("restores the Session on a reload behind a loading state, never showing Sign in", async () => {
    let refreshes = 0;
    const held = heldUntilReleased("post", "/api/auth/refresh", () => {
      refreshes += 1;
      return signedInAsAda();
    });
    const { router } = renderRestoringApp("/", { handlers: [held.handler, currentUserIsAda] });
    const paths = visitedPaths(router);

    expect(screen.getByRole("status")).toHaveTextContent("Checking your session…");
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();

    held.release();

    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
    expect(refreshes).toBe(1);
    expect(paths.every((path) => path === "/")).toBe(true);
  });

  it("sends one boot refresh under StrictMode, as the browser entry renders the app", async () => {
    const refresh = refreshAnswersAda(accessToken);
    await renderApp("/", { handlers: [refresh.handler, currentUserIsAda], strictMode: true });

    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
    expect(refresh.calls.count).toBe(1);
  });

  it("sends a User whose Session restores away from Sign in without showing the form", async () => {
    const held = heldUntilReleased("post", "/api/auth/refresh", () => signedInAsAda());
    const { router } = renderRestoringApp("/sign-in", { handlers: [held.handler, currentUserIsAda] });

    expect(screen.getByRole("status")).toHaveTextContent("Checking your session…");
    expect(screen.queryByRole("heading", { level: 1, name: "Sign in" })).not.toBeInTheDocument();

    held.release();

    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });

  it("shows Sign in after the loading state when the refresh cookie holds no Session", async () => {
    const { router } = renderRestoringApp("/");

    expect(screen.getByRole("status")).toHaveTextContent("Checking your session…");
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/sign-in");
  });

  it("refreshes once the access token is refused, then retries the request with the new token", async () => {
    const refresh = refreshAnswersAda(accessToken, refreshedAccessToken);
    const currentUser = currentUserIsAdaWith(refreshedAccessToken);
    await renderApp("/", { handlers: [refresh.handler, currentUser.handler] });

    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
    expect(refresh.calls.count).toBe(2);
    expect(currentUser.seen).toEqual([`Bearer ${accessToken}`, `Bearer ${refreshedAccessToken}`]);
  });

  it("answers concurrent 401s with one shared refresh, then retries each request once", async () => {
    let refreshes = 0;
    let refreshReached: () => void = () => {};
    const secondRefreshReached = new Promise<void>((resolve) => {
      refreshReached = resolve;
    });
    let release: () => void = () => {};
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const refresh = http.post("/api/auth/refresh", async () => {
      refreshes += 1;
      if (refreshes === 1) return signedInAsAda();
      refreshReached();
      await released;
      return HttpResponse.json({ accessToken: refreshedAccessToken, expiresIn: 900, user: ada });
    });
    const currentUser = currentUserIsAdaWith(refreshedAccessToken);
    await renderApp("/", { handlers: [refresh, currentUser.handler] });

    // The page's own request is refused and starts a refresh; two more requests are refused while it runs.
    await secondRefreshReached;
    const others = [getCurrentUser(), getCurrentUser()];
    await waitFor(() => expect(currentUser.seen).toHaveLength(3));
    release();

    await expect(Promise.all(others)).resolves.toEqual([ada, ada]);
    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
    expect(refreshes).toBe(2);
    expect(currentUser.seen.filter((token) => token === `Bearer ${accessToken}`)).toHaveLength(3);
    expect(currentUser.seen.filter((token) => token === `Bearer ${refreshedAccessToken}`)).toHaveLength(3);
  });

  it("retries a refused request only once, even when the new token is refused too", async () => {
    const refresh = refreshAnswersAda(accessToken, refreshedAccessToken);
    const currentUser = currentUserIsAdaWith("a token no refresh issues");
    await renderApp("/", { handlers: [refresh.handler, currentUser.handler] });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      expectedCopy["auth.unauthenticated"] as string,
    );
    expect(currentUser.seen).toHaveLength(2);
    expect(refresh.calls.count).toBe(2);
  });

  it("signs the User out locally when the refresh fails, sending them to Sign in", async () => {
    let refreshes = 0;
    const refresh = http.post("/api/auth/refresh", () => {
      refreshes += 1;
      return refreshes === 1 ? signedInAsAda() : envelope("auth.session_expired", 401);
    });
    const { router } = await renderApp("/", {
      handlers: [refresh, currentUserIsAdaWith(refreshedAccessToken).handler],
    });

    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/sign-in");
    expect(refreshes).toBe(2);
  });
});
