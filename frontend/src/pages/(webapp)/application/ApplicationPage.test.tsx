import { act, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { returnToExamples } from "@/features/auth/utils/return-to.examples";
import { accessibilityViolations } from "@/tests/support/accessibility";
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
} from "@/tests/support/auth-fixtures";
import { expectedCopy } from "@/tests/support/expected-copy";
import { fillForm } from "@/tests/support/fill-form";
import { renderApp, renderRestoringApp } from "@/tests/support/render-app";
import { orpc } from "@/utils/api/orpc-client";

type Router = ReturnType<typeof renderRestoringApp>["router"];

function urlOf(router: Router) {
  const { pathname, search, hash } = router.state.location;
  return `${pathname}${search}${hash}`;
}

async function signInThroughTheForm(user: Awaited<ReturnType<typeof renderApp>>["user"]) {
  await fillForm(user, { Email: ada.email, Password: adaPassword });
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

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

function signal() {
  let fire: () => void = () => {};
  const fired = new Promise<void>((resolve) => {
    fire = resolve;
  });
  return { fired, fire: () => fire() };
}

// The boot restore answers Ada at once; every later refresh is held until `release()`, then answers Ada with
// `refreshedAccessToken`.
function laterRefreshesHeld() {
  const calls = { count: 0 };
  const [reached, released, answered] = [signal(), signal(), signal()];
  const handler = http.post("/api/auth/refresh", async () => {
    calls.count += 1;
    if (calls.count === 1) return signedInAsAda();
    reached.fire();
    await released.fired;
    answered.fire();
    return HttpResponse.json({ accessToken: refreshedAccessToken, expiresIn: 900, user: ada });
  });
  return { handler, calls, reached: reached.fired, answered: answered.fired, release: released.fire };
}

// A test proving that a response changed nothing must let every reaction to it run first; there is no event to await.
async function settle() {
  await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
}

describe("Application page", () => {
  it("welcomes the signed-in User with the exact heading and their name from the protected endpoint", async () => {
    const { user } = await renderApp("/?auth=sign-up", { handlers: [signUpSucceeds, currentUserIsAda] });

    await fillForm(user, { Email: ada.email, Name: ada.name, Password: adaPassword });
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      /^Welcome to the application\.$/,
    );
    // currentUserIsAda answers only a request bearing the access token from the Sign up response.
    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
  });

  it("shows a readable message when the protected endpoint fails", async () => {
    const { user } = await renderApp("/?auth=sign-in", {
      handlers: [signInSucceeds, http.get("/api/users/me", () => envelope("server.internal", 500))],
    });

    await signInThroughTheForm(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(expectedCopy["server.internal"] as string);
    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome to the application." }),
    ).toBeInTheDocument();
  });
});

describe("Application page accessibility", () => {
  it("has no accessibility violations once the User's name is shown", async () => {
    const { container } = await renderApp("/", {
      handlers: [http.post("/api/auth/refresh", () => signedInAsAda()), currentUserIsAda],
    });
    await screen.findByText("Signed in as Ada Lovelace");

    expect(await accessibilityViolations(container)).toEqual([]);
  });

  it("has no accessibility violations while the name loads", async () => {
    const pending = heldUntilReleased("get", "/api/users/me", () => HttpResponse.json(ada));
    const { container } = await renderApp("/", {
      handlers: [http.post("/api/auth/refresh", () => signedInAsAda()), pending.handler],
    });
    await screen.findByText("Loading your details…");

    expect(await accessibilityViolations(container)).toEqual([]);
    pending.release();
  });

  it("has no accessibility violations when the protected endpoint fails", async () => {
    const { container } = await renderApp("/", {
      handlers: [
        http.post("/api/auth/refresh", () => signedInAsAda()),
        http.get("/api/users/me", () => envelope("server.internal", 500)),
      ],
    });
    await screen.findByRole("alert");

    expect(await accessibilityViolations(container)).toEqual([]);
  });
});

describe("Sign out", () => {
  function signOutSucceeds() {
    const calls = { count: 0 };
    const handler = http.post("/api/auth/sign-out", () => {
      calls.count += 1;
      return new HttpResponse(null, { status: 204 });
    });
    return { handler, calls };
  }

  /** The boot restore finds Ada's Session until a sign-out has been answered, as the cleared cookie would. */
  function sessionEndsWith(signOut: ReturnType<typeof signOutSucceeds>) {
    return http.post("/api/auth/refresh", () =>
      signOut.calls.count === 0 ? signedInAsAda() : envelope("auth.unauthenticated", 401),
    );
  }

  it("ends the Session on the server and lands on Sign in", async () => {
    const signOut = signOutSucceeds();
    const { user, router } = await renderApp("/", {
      handlers: [sessionEndsWith(signOut), currentUserIsAda, signOut.handler],
    });
    await screen.findByText("Signed in as Ada Lovelace");

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(urlOf(router)).toBe("/?auth=sign-in");
    expect(signOut.calls.count).toBe(1);
  });

  it("stays signed out after a reload", async () => {
    const signOut = signOutSucceeds();
    const handlers = [sessionEndsWith(signOut), currentUserIsAda, signOut.handler];
    const first = await renderApp("/", { handlers });
    await screen.findByText("Signed in as Ada Lovelace");
    await first.user.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByRole("heading", { level: 1, name: "Sign in" });
    first.unmount();

    const { router } = await renderApp("/", { handlers });

    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(urlOf(router)).toBe("/?auth=sign-in");
  });

  it("sends the signed-out User's access token with no later request", async () => {
    const signOut = signOutSucceeds();
    const sentWithSignIn: (string | null)[] = [];
    const signInRefused = http.post("/api/auth/sign-in", ({ request }) => {
      sentWithSignIn.push(request.headers.get("Authorization"));
      return envelope("auth.invalid_credentials", 401);
    });
    const { user } = await renderApp("/", {
      handlers: [sessionEndsWith(signOut), currentUserIsAda, signOut.handler, signInRefused],
    });
    await screen.findByText("Signed in as Ada Lovelace");
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByRole("heading", { level: 1, name: "Sign in" });

    await fillForm(user, { Email: ada.email, Password: adaPassword });
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await screen.findByRole("alert");
    expect(sentWithSignIn).toEqual([null]);
  });

  it("does not show the previous User to the next one who signs in", async () => {
    const signOut = signOutSucceeds();
    const grace = {
      id: "65f1c0ffee0000000000b22b",
      email: "grace@example.com",
      name: "Grace Hopper",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const signInAsGrace = http.post("/api/auth/sign-in", () =>
      HttpResponse.json({ accessToken: "access-token-for-grace", expiresIn: 900, user: grace }),
    );
    const currentUser = http.get("/api/users/me", ({ request }) =>
      HttpResponse.json(
        request.headers.get("Authorization") === "Bearer access-token-for-grace" ? grace : ada,
      ),
    );
    const { user } = await renderApp("/", {
      handlers: [sessionEndsWith(signOut), currentUser, signOut.handler, signInAsGrace],
    });
    await screen.findByText("Signed in as Ada Lovelace");
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByRole("heading", { level: 1, name: "Sign in" });

    await fillForm(user, { Email: grace.email, Password: adaPassword });
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Signed in as Grace Hopper")).toBeInTheDocument();
    expect(screen.queryByText("Signed in as Ada Lovelace")).not.toBeInTheDocument();
  });

  it("signs the tab out locally even when the sign-out request fails", async () => {
    const { user, router } = await renderApp("/", {
      handlers: [
        refreshAnswersAda(accessToken).handler,
        currentUserIsAda,
        http.post("/api/auth/sign-out", () => envelope("server.internal", 500)),
      ],
    });
    await screen.findByText("Signed in as Ada Lovelace");

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(urlOf(router)).toBe("/?auth=sign-in");
  });

  it("shows the button as busy while the request is in flight", async () => {
    const held = heldUntilReleased("post", "/api/auth/sign-out", () => new Response(null, { status: 204 }));
    const { user } = await renderApp("/", {
      handlers: [refreshAnswersAda(accessToken).handler, currentUserIsAda, held.handler],
    });
    await screen.findByText("Signed in as Ada Lovelace");

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("button", { name: "Signing out…" })).toBeDisabled();
    held.release();
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
  });

  it("discards a refresh answered after Sign out began: the tab stays signed out and retries nothing", async () => {
    const signOut = signOutSucceeds();
    const refresh = laterRefreshesHeld();
    const currentUser = currentUserIsAdaWith(refreshedAccessToken);
    const { user, router } = await renderApp("/", {
      handlers: [refresh.handler, currentUser.handler, signOut.handler],
    });
    // The page's request is refused, and the refresh it starts is answered only after the User signed out.
    await refresh.reached;
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByRole("heading", { level: 1, name: "Sign in" });

    refresh.release();
    await refresh.answered;
    await settle();

    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(urlOf(router)).toBe("/?auth=sign-in");
    expect(currentUser.seen).toEqual([`Bearer ${accessToken}`]);
  });

  it("does not let a request refused while signing out restore the Session", async () => {
    const signOut = heldUntilReleased(
      "post",
      "/api/auth/sign-out",
      () => new Response(null, { status: 204 }),
    );
    const refresh = laterRefreshesHeld();
    const seen: (string | null)[] = [];
    // The access token expires once the page has shown Ada.
    const currentUser = http.get("/api/users/me", ({ request }) => {
      seen.push(request.headers.get("Authorization"));
      return seen.length === 1 ? HttpResponse.json(ada) : envelope("auth.unauthenticated", 401);
    });
    const { user, router } = await renderApp("/", {
      handlers: [refresh.handler, currentUser, signOut.handler],
    });
    await screen.findByText("Signed in as Ada Lovelace");
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    const refused = expect(orpc.users.me.call()).rejects.toThrow();
    await waitFor(() => expect(seen).toHaveLength(2));
    await settle();
    signOut.release();
    await screen.findByRole("heading", { level: 1, name: "Sign in" });
    refresh.release();
    await settle();

    await refused;
    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(urlOf(router)).toBe("/?auth=sign-in");
    expect(seen).toHaveLength(2);
    expect(refresh.calls.count).toBe(1);
  });
});

describe("the Session survives reloads", () => {
  function visitedUrls(router: Router) {
    const urls = [urlOf(router)];
    router.subscribe(() => urls.push(urlOf(router)));
    return urls;
  }

  it("restores the Session on a reload behind a loading state, never showing Sign in", async () => {
    let refreshes = 0;
    const held = heldUntilReleased("post", "/api/auth/refresh", () => {
      refreshes += 1;
      return signedInAsAda();
    });
    const { router } = renderRestoringApp("/", { handlers: [held.handler, currentUserIsAda] });
    const urls = visitedUrls(router);

    expect(screen.getByRole("status")).toHaveTextContent("Checking your session…");
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();

    held.release();

    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
    expect(refreshes).toBe(1);
    expect(urls.every((url) => url === "/")).toBe(true);
  });

  it("sends one boot refresh under StrictMode, as the browser entry renders the app", async () => {
    const refresh = refreshAnswersAda(accessToken);
    await renderApp("/", { handlers: [refresh.handler, currentUserIsAda], strictMode: true });

    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
    expect(refresh.calls.count).toBe(1);
  });

  it("sends a User whose Session restores away from Sign in without showing the form", async () => {
    const held = heldUntilReleased("post", "/api/auth/refresh", () => signedInAsAda());
    const { router } = renderRestoringApp("/?auth=sign-in", { handlers: [held.handler, currentUserIsAda] });

    expect(screen.getByRole("status")).toHaveTextContent("Checking your session…");
    expect(screen.queryByRole("heading", { level: 1, name: "Sign in" })).not.toBeInTheDocument();

    held.release();

    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
    expect(urlOf(router)).toBe("/");
  });

  it("shows Sign in after the loading state when the refresh cookie holds no Session", async () => {
    const { router } = renderRestoringApp("/");

    expect(screen.getByRole("status")).toHaveTextContent("Checking your session…");
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(urlOf(router)).toBe("/?auth=sign-in");
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
    const others = [orpc.users.me.call(), orpc.users.me.call()];
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
    expect(urlOf(router)).toBe("/?auth=sign-in");
    expect(refreshes).toBe(2);
  });
});

describe("Sign in and Sign up addressed by search parameter", () => {
  const bookmark = "/?from=bookmark";
  const bookmarkReturnTo = "returnTo=%2F%3Ffrom%3Dbookmark";

  function renderSignedInApp(path: string) {
    return renderApp(path, { handlers: [refreshAnswersAda(accessToken).handler, currentUserIsAda] });
  }

  it("sends a signed-out visitor at / to Sign in, replacing the history entry", async () => {
    const { router } = await renderApp("/");

    expect(urlOf(router)).toBe("/?auth=sign-in");
    expect(router.state.historyAction).toBe("REPLACE");
    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
  });

  it.each([
    ["/?auth=sign-in", "Sign in"],
    ["/?auth=sign-up", "Sign up"],
    ["/?auth=register", "Sign in"],
  ])("shows %s as the %s form, full screen", async (path, form) => {
    const { router } = await renderApp(path);

    expect(screen.getByRole("heading", { level: 1, name: form })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(urlOf(router)).toBe(path);
  });

  it("titles the page after the visible form, and the Application page once signed in", async () => {
    const { user } = await renderApp("/?auth=sign-in", { handlers: [signUpSucceeds, currentUserIsAda] });
    expect(document.title).toBe("Sign in");

    await user.click(screen.getByRole("link", { name: "Sign up" }));
    expect(document.title).toBe("Sign up");

    await fillForm(user, { Email: ada.email, Name: ada.name, Password: adaPassword });
    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await screen.findByText("Signed in as Ada Lovelace");
    expect(document.title).toBe("The application");
  });

  it("switches between the forms by swapping only auth, keeping returnTo and replacing the history entry", async () => {
    const { user, router } = await renderApp(`/?auth=sign-in&${bookmarkReturnTo}`);

    await user.click(screen.getByRole("link", { name: "Sign up" }));

    expect(screen.getByRole("heading", { level: 1, name: "Sign up" })).toBeInTheDocument();
    expect(urlOf(router)).toBe(`/?auth=sign-up&${bookmarkReturnTo}`);
    expect(router.state.historyAction).toBe("REPLACE");

    await user.click(screen.getByRole("link", { name: "Sign in" }));

    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(urlOf(router)).toBe(`/?auth=sign-in&${bookmarkReturnTo}`);
    expect(router.state.historyAction).toBe("REPLACE");
  });

  it("sends a signed-out visitor at a protected path to Sign in, carrying the path and search as returnTo", async () => {
    const { router } = await renderApp(bookmark);

    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(urlOf(router)).toBe(`/?auth=sign-in&${bookmarkReturnTo}`);
    expect(router.state.historyAction).toBe("REPLACE");
  });

  it("brings a bounced visitor back to the page they asked for, hash included, once signed in", async () => {
    const { user, router } = await renderApp(`${bookmark}#top`, {
      handlers: [signInSucceeds, currentUserIsAda],
    });
    expect(urlOf(router)).toBe("/?auth=sign-in&returnTo=%2F%3Ffrom%3Dbookmark%23top");

    await signInThroughTheForm(user);

    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
    expect(urlOf(router)).toBe(`${bookmark}#top`);
  });

  it("brings the visitor to returnTo after a Sign up, too", async () => {
    const { user, router } = await renderApp(`/?auth=sign-up&${bookmarkReturnTo}`, {
      handlers: [signUpSucceeds, currentUserIsAda],
    });

    await fillForm(user, { Email: ada.email, Name: ada.name, Password: adaPassword });
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
    expect(urlOf(router)).toBe(bookmark);
  });

  describe("goes to returnTo after Sign in only when it is a same-site path, otherwise to /", () => {
    for (const example of returnToExamples) {
      const expected = example.safe ? example.returnTo : "/";
      it(`${JSON.stringify(example.returnTo)} (${example.note}) leads to ${JSON.stringify(expected)}`, async () => {
        const { user, router } = await renderApp(
          `/?auth=sign-in&returnTo=${encodeURIComponent(example.returnTo)}`,
          { handlers: [signInSucceeds, currentUserIsAda] },
        );

        await signInThroughTheForm(user);

        await waitFor(() => expect(urlOf(router)).toBe(expected));
        if (router.state.location.pathname === "/") {
          expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
        } else {
          expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
        }
      });
    }
  });

  it.each([
    ["/?auth=sign-in", "/"],
    ["/?auth=sign-up&returnTo=%2F%2Fevil.example", "/"],
    ["/?from=bookmark&auth=sign-up", bookmark],
  ])(
    "removes auth and returnTo for a signed-in User who opens %s, showing the Application page",
    async (path, expected) => {
      const { router } = await renderSignedInApp(path);

      expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
      expect(urlOf(router)).toBe(expected);
      expect(router.state.historyAction).toBe("REPLACE");
    },
  );

  it("sends a signed-in User who opens an auth URL on to its safe returnTo", async () => {
    const { router } = await renderSignedInApp(`/?auth=sign-in&${bookmarkReturnTo}`);

    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
    expect(urlOf(router)).toBe(bookmark);
  });

  it("sends a User signed in in this tab who navigates to an auth URL to the Application page", async () => {
    const { user, router } = await renderApp("/?auth=sign-in", {
      handlers: [signInSucceeds, currentUserIsAda],
    });
    await signInThroughTheForm(user);
    await screen.findByText("Signed in as Ada Lovelace");

    await act(() => router.navigate("/?auth=sign-up"));

    expect(urlOf(router)).toBe("/");
    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome to the application." }),
    ).toBeInTheDocument();
  });

  it.each([
    ["/sign-in", "/?auth=sign-in"],
    ["/sign-up", "/?auth=sign-up"],
    [`/sign-in?${bookmarkReturnTo}`, `/?auth=sign-in&${bookmarkReturnTo}`],
    [`/sign-up?${bookmarkReturnTo}`, `/?auth=sign-up&${bookmarkReturnTo}`],
  ])("redirects the old path %s to %s", async (oldPath, newUrl) => {
    const { router } = await renderApp(oldPath);

    expect(urlOf(router)).toBe(newUrl);
    expect(router.state.historyAction).toBe("REPLACE");
  });
});
