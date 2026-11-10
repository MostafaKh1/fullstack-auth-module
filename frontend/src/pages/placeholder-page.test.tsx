import { screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { renderApp } from "../test/render-app";

describe("placeholder page", () => {
  it("renders at the root path and reports the API as up when health answers 200", async () => {
    renderApp("/", {
      handlers: [http.get("/api/health", () => HttpResponse.json({ status: "ok", database: "up" }))],
    });

    expect(screen.getByRole("heading", { level: 1, name: "Sign up / Sign in" })).toBeInTheDocument();
    expect(await screen.findByText("The API is up.")).toBeInTheDocument();
  });

  it("reports the API as unreachable when health answers 503", async () => {
    renderApp("/", {
      handlers: [
        http.get("/api/health", () =>
          HttpResponse.json(
            { code: "server.unavailable", status: 503, traceId: "t-1", retryable: true },
            { status: 503 },
          ),
        ),
      ],
    });

    expect(await screen.findByText("The API is unreachable.")).toBeInTheDocument();
  });

  it("shows a not-found page at a path with no route", () => {
    renderApp("/no-such-page");

    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
  });
});
