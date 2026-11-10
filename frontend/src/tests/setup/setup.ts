import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { failOnUndeclaredRequests, listenForDeclaredRequestsOnly, server } from "./server";

beforeAll(() => listenForDeclaredRequestsOnly());

afterEach(() => {
  cleanup();
  server.resetHandlers();
  failOnUndeclaredRequests();
});

afterAll(() => server.close());
