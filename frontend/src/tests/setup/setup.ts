import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { failOnUndeclaredRequests, listenForDeclaredRequestsOnly, server } from "@/tests/setup/server";

beforeAll(() => listenForDeclaredRequestsOnly());

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  server.resetHandlers();
  failOnUndeclaredRequests();
});

afterAll(() => server.close());
