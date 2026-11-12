import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { accessibilityViolations } from "@/tests/support/accessibility";
import { renderApp } from "@/tests/support/render-app";

describe("Not found page", () => {
  it("names the page and links back to the application", async () => {
    await renderApp("/no-such-page");

    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to the application" })).toHaveAttribute("href", "/");
  });

  it("has no accessibility violations", async () => {
    const { container } = await renderApp("/no-such-page");

    expect(await accessibilityViolations(container)).toEqual([]);
  });
});
