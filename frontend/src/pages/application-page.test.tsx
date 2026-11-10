import { act, screen } from "@testing-library/react";
import { http } from "msw";
import { describe, expect, it } from "vitest";
import {
  ada,
  adaPassword,
  currentUserIsAda,
  envelope,
  signInSucceeds,
  signUpSucceeds,
} from "../test/auth-fixtures";
import { expectedCopy } from "../test/expected-copy";
import { fillForm } from "../test/fill-form";
import { renderApp } from "../test/render-app";

async function signInThroughTheForm(user: ReturnType<typeof renderApp>["user"]) {
  await fillForm(user, { Email: ada.email, Password: adaPassword });
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("Application page", () => {
  it("welcomes the signed-in User with the exact heading and their name from the protected endpoint", async () => {
    const { user } = renderApp("/sign-up", { handlers: [signUpSucceeds, currentUserIsAda] });

    await fillForm(user, { Email: ada.email, Name: ada.name, Password: adaPassword });
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      /^Welcome to the application\.$/,
    );
    // currentUserIsAda answers only a request bearing the access token from the Sign up response.
    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
  });

  it("shows a readable message when the protected endpoint fails", async () => {
    const { user } = renderApp("/sign-in", {
      handlers: [signInSucceeds, http.get("/api/users/me", () => envelope("server.internal", 500))],
    });

    await signInThroughTheForm(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(expectedCopy["server.internal"] as string);
    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome to the application." }),
    ).toBeInTheDocument();
  });

  it("sends a signed-out visitor to Sign in, then back to the page they asked for once signed in", async () => {
    const { user, router } = renderApp("/?from=bookmark#top", {
      handlers: [signInSucceeds, currentUserIsAda],
    });

    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/sign-in");

    await signInThroughTheForm(user);

    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
    expect(router.state.location).toMatchObject({ pathname: "/", search: "?from=bookmark", hash: "#top" });
  });

  it("keeps the return path when the visitor switches from Sign in to Sign up", async () => {
    const { user, router } = renderApp("/?from=bookmark", { handlers: [signUpSucceeds, currentUserIsAda] });

    await user.click(screen.getByRole("link", { name: "Sign up" }));
    await fillForm(user, { Email: ada.email, Name: ada.name, Password: adaPassword });
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
    expect(router.state.location).toMatchObject({ pathname: "/", search: "?from=bookmark" });
  });

  it.each(["/sign-in", "/sign-up"])(
    "sends a signed-in User who opens %s to the Application page",
    async (path) => {
      const { user, router } = renderApp("/sign-in", { handlers: [signInSucceeds, currentUserIsAda] });
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
