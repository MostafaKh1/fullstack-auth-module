import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fillForm } from "./fill-form";
import { renderApp } from "./render-app";
import { failOnUndeclaredRequests } from "./server";

describe("rendered-app harness", () => {
  it("fails a test that makes a request it did not declare", async () => {
    const { user } = renderApp("/sign-in");

    // Submitting Sign in posts to /api/auth/sign-in, which this test does not declare.
    await fillForm(user, { Email: "ada@example.com", Password: "Passw0rd!" });
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(failOnUndeclaredRequests).toThrow("Undeclared request: POST /api/auth/sign-in"),
    );
  });

  it("shows a not-found page at a path with no route", () => {
    renderApp("/no-such-page");

    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
  });
});
