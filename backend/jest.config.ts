import type { Config } from "jest";

// Tests live at the HTTP seam only (ADR 0004): each file boots the real app against its own throwaway MongoDB.
const config: Config = {
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/src/test/**/*.spec.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  transform: { "^.+\\.ts$": "ts-jest" },
  testTimeout: 30_000,
};

export default config;
