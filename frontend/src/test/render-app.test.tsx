import { waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "./render-app";
import { failOnUndeclaredRequests } from "./server";

describe("rendered-app harness", () => {
  it("fails a test that makes a request it did not declare", async () => {
    renderApp("/");

    // The placeholder page asks for /api/health, which this test does not declare.
    await waitFor(() => expect(failOnUndeclaredRequests).toThrow("Undeclared request: GET /api/health"));
  });
});
