import { signUpExamples } from "@app/contract/field-rules.examples";
import { screen, waitFor, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { accessibilityViolations } from "@/tests/support/accessibility";
import {
  ada,
  adaPassword,
  currentUserIsAda,
  envelope,
  heldUntilReleased,
  signedInAsAda,
} from "@/tests/support/auth-fixtures";
import { expectedCopy, fallbackCopy, unreachableCopy } from "@/tests/support/expected-copy";
import { enterField, fillForm } from "@/tests/support/fill-form";
import { renderApp } from "@/tests/support/render-app";

const labels = { email: "Email", name: "Name", password: "Password" } as const;
const validForm = { Email: ada.email, Name: ada.name, Password: adaPassword };

function signUpButton() {
  return screen.getByRole("button", { name: "Sign up" });
}

function checklistItem(rule: string) {
  const checklist = screen.getByRole("list", { name: "Your password needs" });
  const text = within(checklist).getByText(rule);
  const item = text.closest("li");
  if (!item) throw new Error(`No checklist item for "${rule}"`);
  return item;
}

describe("Sign up page", () => {
  it("signs a new User up and lands on the Application page, signed in as them", async () => {
    let body: unknown;
    const { user, router } = await renderApp("/?auth=sign-up", {
      handlers: [
        http.post("/api/auth/sign-up", async ({ request }) => {
          body = await request.json();
          return signedInAsAda(201);
        }),
        currentUserIsAda,
      ],
    });
    expect(screen.getByRole("heading", { level: 1, name: "Sign up" })).toBeInTheDocument();

    await fillForm(user, validForm);
    await user.click(signUpButton());

    expect(
      await screen.findByRole("heading", { level: 1, name: "Welcome to the application." }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Signed in as Ada Lovelace")).toBeInTheDocument();
    expect(router.state.location).toMatchObject({ pathname: "/", search: "" });
    expect(body).toEqual({ email: ada.email, name: ada.name, password: adaPassword });
  });

  describe("accepts or rejects every worked example, with the field's message beside it", () => {
    for (const example of signUpExamples) {
      const label = labels[example.field];
      const shown = example.input === undefined ? "missing" : JSON.stringify(example.input);

      if (example.input?.includes("\n")) {
        it(`${example.field} ${shown} (${example.note}): an input cannot hold a line break, so it never reaches the rules`, async () => {
          const { user } = await renderApp("/?auth=sign-up");
          const field = await enterField(user, label, example.input);
          expect((field as HTMLInputElement).value).not.toContain("\n");
        });
        continue;
      }

      if (example.valid) {
        it(`accepts ${example.field} ${shown} (${example.note})`, async () => {
          const { user } = await renderApp("/?auth=sign-up");
          const field = await enterField(user, label, "");
          await waitFor(() => expect(field).toHaveAccessibleDescription(expectedCopy["field.required"]));

          await enterField(user, label, example.input);

          await waitFor(() => expect(field).not.toHaveAccessibleDescription());
          expect(field).toHaveAttribute("aria-invalid", "false");
        });
      } else {
        const [firstCode] = example.codes;
        it(`rejects ${example.field} ${shown} (${example.note}) with ${firstCode}`, async () => {
          const { user } = await renderApp("/?auth=sign-up");

          const field = await enterField(user, label, example.input);

          await waitFor(() => expect(field).toHaveAccessibleDescription(expectedCopy[firstCode as string]));
          expect(field).toHaveAttribute("aria-invalid", "true");
        });
      }
    }

    for (const example of signUpExamples.filter((row) => row.valid && "stored" in row && row.stored)) {
      const stored = example.valid ? example.stored : undefined;
      it(`sends ${example.field} ${JSON.stringify(example.input)} as ${JSON.stringify(stored)}`, async () => {
        let body: Record<string, unknown> = {};
        const { user } = await renderApp("/?auth=sign-up", {
          handlers: [
            http.post("/api/auth/sign-up", async ({ request }) => {
              body = (await request.json()) as Record<string, unknown>;
              return envelope("user.email_taken", 409);
            }),
          ],
        });

        await fillForm(user, { ...validForm, [labels[example.field]]: example.input ?? "" });
        await user.click(signUpButton());

        await screen.findByText(expectedCopy["user.email_taken"] as string);
        expect(body[example.field]).toBe(stored);
      });
    }

    it("sends the password exactly as typed, never trimmed", async () => {
      let body: Record<string, unknown> = {};
      const { user } = await renderApp("/?auth=sign-up", {
        handlers: [
          http.post("/api/auth/sign-up", async ({ request }) => {
            body = (await request.json()) as Record<string, unknown>;
            return envelope("user.email_taken", 409);
          }),
        ],
      });

      await fillForm(user, { ...validForm, Password: "  Pa0!  " });
      await user.click(signUpButton());

      await screen.findByText(expectedCopy["user.email_taken"] as string);
      expect(body.password).toBe("  Pa0!  ");
    });
  });

  it("ticks off each password rule in the checklist as it is met", async () => {
    const { user } = await renderApp("/?auth=sign-up");
    const password = screen.getByLabelText("Password");
    const rules = ["8 to 128 characters", "A letter", "A number", "A special character"];
    for (const rule of rules) expect(checklistItem(rule)).toHaveTextContent("Not yet");

    await user.type(password, "é");
    expect(checklistItem("A letter")).toHaveTextContent("Done");
    expect(checklistItem("A number")).toHaveTextContent("Not yet");

    await user.type(password, "1");
    expect(checklistItem("A number")).toHaveTextContent("Done");
    expect(checklistItem("A special character")).toHaveTextContent("Not yet");

    await user.type(password, " ");
    expect(checklistItem("A special character")).toHaveTextContent("Not yet");

    await user.type(password, "€");
    expect(checklistItem("A special character")).toHaveTextContent("Done");
    expect(checklistItem("8 to 128 characters")).toHaveTextContent("Not yet");

    await user.type(password, "abcd");
    expect(checklistItem("8 to 128 characters")).toHaveTextContent("Done");
  });

  it("lets the visitor show and hide the password", async () => {
    const { user } = await renderApp("/?auth=sign-up");
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("shows the password control as an icon with no visible text, pressed while the password is shown", async () => {
    const { user } = await renderApp("/?auth=sign-up");

    const show = screen.getByRole("button", { name: "Show password" });
    expect(show).toHaveTextContent("");
    expect(show).toHaveAttribute("aria-pressed", "false");

    show.focus();
    await user.keyboard("{Enter}");
    const hide = screen.getByRole("button", { name: "Hide password" });
    expect(hide).toHaveTextContent("");
    expect(hide).toHaveAttribute("aria-pressed", "true");
  });

  it("does not send the request while a field breaks a rule", async () => {
    const { user } = await renderApp("/?auth=sign-up");

    await fillForm(user, { ...validForm, Password: "Password1" });
    await user.click(signUpButton());

    await waitFor(() =>
      expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
        expectedCopy["password.missing_special"],
      ),
    );
  });

  it("puts each validation issue from the server on the field it names", async () => {
    const { user } = await renderApp("/?auth=sign-up", {
      handlers: [
        http.post("/api/auth/sign-up", () =>
          envelope("request.validation_failed", 400, {
            issues: [
              { path: ["name"], code: "name.too_short" },
              { path: ["password"], code: "password.missing_number" },
              { path: ["password"], code: "password.missing_special" },
            ],
          }),
        ),
      ],
    });

    await fillForm(user, validForm);
    await user.click(signUpButton());

    await waitFor(() =>
      expect(screen.getByLabelText("Name")).toHaveAccessibleDescription(expectedCopy["name.too_short"]),
    );
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
      expectedCopy["password.missing_number"],
    );
    expect(screen.getByLabelText("Email")).not.toHaveAccessibleDescription();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a validation issue on a field the form does not have as a form alert", async () => {
    const { user } = await renderApp("/?auth=sign-up", {
      handlers: [
        http.post("/api/auth/sign-up", () =>
          envelope("request.validation_failed", 400, {
            issues: [{ path: ["nickname"], code: "field.required" }],
          }),
        ),
      ],
    });

    await fillForm(user, validForm);
    await user.click(signUpButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(fallbackCopy);
  });

  it("puts a taken email on the email field", async () => {
    const { user } = await renderApp("/?auth=sign-up", {
      handlers: [http.post("/api/auth/sign-up", () => envelope("user.email_taken", 409))],
    });

    await fillForm(user, validForm);
    await user.click(signUpButton());

    await waitFor(() =>
      expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
        "An account with this email already exists",
      ),
    );
    expect(screen.getByLabelText("Email")).toHaveFocus();
  });

  it("shows a readable message when the server cannot be reached", async () => {
    const { user } = await renderApp("/?auth=sign-up", {
      handlers: [http.post("/api/auth/sign-up", () => HttpResponse.error())],
    });

    await fillForm(user, validForm);
    await user.click(signUpButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(unreachableCopy);
    expect(signUpButton()).toBeEnabled();
  });

  it("shows a readable message when the server fails, and never the server's own message", async () => {
    const { user } = await renderApp("/?auth=sign-up", {
      handlers: [
        http.post("/api/auth/sign-up", () => envelope("server.internal", 500, { message: "Mongo exploded" })),
      ],
    });

    await fillForm(user, validForm);
    await user.click(signUpButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(expectedCopy["server.internal"] as string);
    expect(alert).not.toHaveTextContent("Mongo exploded");
  });

  it("falls back to a generic message for an error code it has no copy for", async () => {
    const { user } = await renderApp("/?auth=sign-up", {
      handlers: [http.post("/api/auth/sign-up", () => envelope("teapot.brewing", 418))],
    });

    await fillForm(user, validForm);
    await user.click(signUpButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(fallbackCopy);
  });

  it("disables the submit button and shows progress while the request is in flight", async () => {
    const held = heldUntilReleased("post", "/api/auth/sign-up", () => envelope("user.email_taken", 409));
    const { user } = await renderApp("/?auth=sign-up", { handlers: [held.handler] });

    await fillForm(user, validForm);
    await user.click(signUpButton());

    const pending = await screen.findByRole("button", { name: "Signing up…" });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute("aria-busy", "true");

    held.release();
    await waitFor(() => expect(signUpButton()).toBeEnabled());
  });

  it("has no accessibility violations when empty", async () => {
    const { container } = await renderApp("/?auth=sign-up");

    expect(await accessibilityViolations(container)).toEqual([]);
  });

  it("has no accessibility violations with every field in error", async () => {
    const { user, container } = await renderApp("/?auth=sign-up");

    await user.click(signUpButton());
    await waitFor(() =>
      expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(expectedCopy["field.required"]),
    );
    for (const label of Object.values(labels)) {
      expect(screen.getByLabelText(label)).toHaveAttribute("aria-invalid", "true");
    }

    expect(await accessibilityViolations(container)).toEqual([]);
  });

  it("links to Sign in", async () => {
    const { user, router } = await renderApp("/?auth=sign-up");

    await user.click(screen.getByRole("link", { name: "Sign in" }));

    expect(router.state.location.search).toBe("?auth=sign-in");
    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
  });
});
