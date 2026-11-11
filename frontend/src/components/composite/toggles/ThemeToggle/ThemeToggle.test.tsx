import { screen } from "@testing-library/react";
import { http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { accessibilityViolations } from "@/tests/support/accessibility";
import { currentUserIsAda, signedInAsAda } from "@/tests/support/auth-fixtures";
import { renderApp } from "@/tests/support/render-app";

const isDark = () => document.documentElement.classList.contains("dark");
const toggle = () => screen.getByRole("button", { name: "Dark mode" });
const signedIn = () => [http.post("/api/auth/refresh", () => signedInAsAda()), currentUserIsAda];

describe("Theme toggle", () => {
  afterEach(() => vi.restoreAllMocks());

  it("opens in light mode on a first visit, whatever the system prefers", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query) => ({ matches: query.includes("dark"), media: query }) as MediaQueryList,
    );
    await renderApp("/?auth=sign-in");

    expect(isDark()).toBe(false);
    expect(toggle()).toHaveAttribute("aria-pressed", "false");
  });

  it("opens in light mode when browser storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { user } = await renderApp("/?auth=sign-in");

    expect(isDark()).toBe(false);
    await user.click(toggle());
    expect(isDark()).toBe(true);
  });

  it("switches to dark and back, and aria-pressed follows", async () => {
    const { user } = await renderApp("/?auth=sign-in");

    await user.click(toggle());
    expect(isDark()).toBe(true);
    expect(toggle()).toHaveAttribute("aria-pressed", "true");

    await user.click(toggle());
    expect(isDark()).toBe(false);
    expect(toggle()).toHaveAttribute("aria-pressed", "false");
  });

  it("is operated with the keyboard", async () => {
    const { user } = await renderApp("/?auth=sign-in");

    toggle().focus();
    await user.keyboard("{Enter}");
    expect(isDark()).toBe(true);
    await user.keyboard(" ");
    expect(isDark()).toBe(false);
  });

  it("remembers the choice when the app is opened again", async () => {
    const first = await renderApp("/?auth=sign-in");
    await first.user.click(toggle());
    first.unmount();
    document.documentElement.classList.remove("dark");

    await renderApp("/?auth=sign-in");

    expect(isDark()).toBe(true);
    expect(toggle()).toHaveAttribute("aria-pressed", "true");
  });

  it("is on the Application page too", async () => {
    const { user } = await renderApp("/", { handlers: signedIn() });
    await screen.findByText("Signed in as Ada Lovelace");

    await user.click(toggle());

    expect(isDark()).toBe(true);
  });

  it("leaves no accessibility violations in dark mode on Sign in", async () => {
    const { user, container } = await renderApp("/?auth=sign-in");
    await user.click(toggle());

    expect(await accessibilityViolations(container)).toEqual([]);
  });

  it("leaves no accessibility violations in dark mode on the Application page", async () => {
    const { user, container } = await renderApp("/", { handlers: signedIn() });
    await screen.findByText("Signed in as Ada Lovelace");
    await user.click(toggle());

    expect(await accessibilityViolations(container)).toEqual([]);
  });
});
