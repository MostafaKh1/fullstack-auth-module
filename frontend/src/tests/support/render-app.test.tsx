import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { failOnUndeclaredRequests } from "@/tests/setup/server";
import { fillForm } from "@/tests/support/fill-form";
import { renderApp } from "@/tests/support/render-app";

describe("rendered-app harness", () => {
  it("fails a test that makes a request it did not declare", async () => {
    const { user } = await renderApp("/?auth=sign-in");

    // Submitting Sign in posts to /api/auth/sign-in, which this test does not declare.
    await fillForm(user, { Email: "ada@example.com", Password: "Passw0rd!" });
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(failOnUndeclaredRequests).toThrow("Undeclared request: POST /api/auth/sign-in"),
    );
  });

  it("shows a not-found page at a path with no route", async () => {
    await renderApp("/no-such-page");

    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
  });
});
