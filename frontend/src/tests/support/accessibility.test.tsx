import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { accessibilityViolations } from "@/tests/support/accessibility";

describe("accessibility check", () => {
  it("reports a field whose label points at another element", async () => {
    const { container } = render(
      <main>
        <label htmlFor="elsewhere">Email</label>
        <input id="email" type="email" />
      </main>,
    );

    expect(await accessibilityViolations(container)).toContainEqual(expect.stringMatching(/^label: /));
  });

  it("reports nothing for a field tied to its label", async () => {
    const { container } = render(
      <main>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" />
      </main>,
    );

    expect(await accessibilityViolations(container)).toEqual([]);
  });
});
