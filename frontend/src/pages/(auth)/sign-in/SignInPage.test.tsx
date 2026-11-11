import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { signInExamples } from "../../../components/composite/AuthScreen/AuthScreenFieldRules.examples";
import {
  ada,
  adaPassword,
  currentUserIsAda,
  envelope,
  heldUntilReleased,
  signedInAsAda,
} from "../../../tests/support/auth-fixtures";
import {
  contractErrorCodes,
  expectedCopy,
  expectedErrorCopy,
  unreachableCopy,
} from "../../../tests/support/expected-copy";
import { enterField, fillForm } from "../../../tests/support/fill-form";
import { renderApp } from "../../../tests/support/render-app";

const labels = { email: "Email", password: "Password" } as const;
const validForm = { Email: ada.email, Password: adaPassword };

function signInButton() {
  return screen.getByRole("button", { name: "Sign in" });
}

describe("Sign in page", () => {
  it("signs a returning User in and lands on the Application page", async () => {
    let body: unknown;
    const { user, router } = await renderApp("/?auth=sign-in", {
      handlers: [
        http.post("/api/auth/sign-in", async ({ request }) => {
          body = await request.json();
          return signedInAsAda();
        }),
        currentUserIsAda,
      ],
    });
    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();

    await fillForm(user, { Email: "  ADA@example.com ", Password: adaPassword });
    await user.click(signInButton());

    expect(
      await screen.findByRole("heading", { level: 1, name: "Welcome to the application." }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
    expect(router.state.location).toMatchObject({ pathname: "/", search: "" });
    expect(body).toEqual({ email: ada.email, password: adaPassword });
  });

  describe("accepts or rejects every worked example, with the field's message beside it", () => {
    for (const example of signInExamples) {
      const label = labels[example.field as keyof typeof labels];
      const shown = example.input === undefined ? "missing" : JSON.stringify(example.input);

      if (example.valid) {
        it(`accepts ${example.field} ${shown} (${example.note})`, async () => {
          const { user } = await renderApp("/?auth=sign-in");
          const field = await enterField(user, label, "");
          await waitFor(() => expect(field).toHaveAccessibleDescription(expectedCopy["field.required"]));

          await enterField(user, label, example.input);

          await waitFor(() => expect(field).not.toHaveAccessibleDescription());
          expect(field).toHaveAttribute("aria-invalid", "false");
        });
      } else {
        const [firstCode] = example.codes;
        it(`rejects ${example.field} ${shown} (${example.note}) with ${firstCode}`, async () => {
          const { user } = await renderApp("/?auth=sign-in");

          const field = await enterField(user, label, example.input);

          await waitFor(() => expect(field).toHaveAccessibleDescription(expectedCopy[firstCode as string]));
          expect(field).toHaveAttribute("aria-invalid", "true");
        });
      }
    }
  });

  it("shows the one generic message for wrong credentials", async () => {
    const { user } = await renderApp("/?auth=sign-in", {
      handlers: [http.post("/api/auth/sign-in", () => envelope("auth.invalid_credentials", 401))],
    });

    await fillForm(user, validForm);
    await user.click(signInButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(screen.getByLabelText("Email")).not.toHaveAccessibleDescription();
    expect(screen.getByLabelText("Password")).not.toHaveAccessibleDescription();
  });

  it("asks the User to wait when attempts are slowed down", async () => {
    const { user } = await renderApp("/?auth=sign-in", {
      handlers: [http.post("/api/auth/sign-in", () => envelope("request.rate_limited", 429))],
    });

    await fillForm(user, validForm);
    await user.click(signInButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      expectedCopy["request.rate_limited"] as string,
    );
  });

  it("has a sentence for every error code in the contract", () => {
    expect(contractErrorCodes.length).toBeGreaterThan(0);
    expect(contractErrorCodes.filter((code) => !Object.hasOwn(expectedErrorCopy, code))).toEqual([]);
  });

  it.each(contractErrorCodes)("shows its own sentence for %s", async (code) => {
    const sentence = expectedErrorCopy[code] as string;
    const { user } = await renderApp("/?auth=sign-in", {
      handlers: [http.post("/api/auth/sign-in", () => envelope(code, 400))],
    });

    await fillForm(user, validForm);
    await user.click(signInButton());

    expect(await screen.findByText(sentence)).toBeInTheDocument();
  });

  it("shows a readable message when the server cannot be reached", async () => {
    const { user } = await renderApp("/?auth=sign-in", {
      handlers: [http.post("/api/auth/sign-in", () => HttpResponse.error())],
    });

    await fillForm(user, validForm);
    await user.click(signInButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(unreachableCopy);
  });

  it("shows a readable message when a proxy answers without the error envelope", async () => {
    const { user } = await renderApp("/?auth=sign-in", {
      handlers: [http.post("/api/auth/sign-in", () => new HttpResponse("Bad Gateway", { status: 502 }))],
    });

    await fillForm(user, validForm);
    await user.click(signInButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(unreachableCopy);
  });

  it("clears the form alert when the User tries again", async () => {
    let attempts = 0;
    const { user } = await renderApp("/?auth=sign-in", {
      handlers: [
        http.post("/api/auth/sign-in", () => {
          attempts += 1;
          return attempts === 1 ? envelope("auth.invalid_credentials", 401) : signedInAsAda();
        }),
        currentUserIsAda,
      ],
    });

    await fillForm(user, validForm);
    await user.click(signInButton());
    await screen.findByRole("alert");
    await user.click(signInButton());

    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
  });

  it("disables the submit button and shows progress while the request is in flight", async () => {
    const held = heldUntilReleased("post", "/api/auth/sign-in", () =>
      envelope("auth.invalid_credentials", 401),
    );
    const { user } = await renderApp("/?auth=sign-in", { handlers: [held.handler] });

    await fillForm(user, validForm);
    await user.click(signInButton());

    const pending = await screen.findByRole("button", { name: "Signing in…" });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute("aria-busy", "true");

    held.release();
    await waitFor(() => expect(signInButton()).toBeEnabled());
  });

  it("links to Sign up", async () => {
    const { user, router } = await renderApp("/?auth=sign-in");

    await user.click(screen.getByRole("link", { name: "Sign up" }));

    expect(router.state.location.search).toBe("?auth=sign-up");
    expect(screen.getByRole("heading", { level: 1, name: "Sign up" })).toBeInTheDocument();
  });
});
