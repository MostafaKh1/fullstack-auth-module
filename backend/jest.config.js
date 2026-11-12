// Tests live at the HTTP seam only (ADR 0004): each file boots the real app against its own throwaway MongoDB.
// The back end is ES modules, so Jest runs in its ESM mode (`--experimental-vm-modules`, set by the `test` script); the
// mappers drop the `.js` that ES-module imports carry, so Jest finds the `.ts` source.
/** @type {import("jest").Config} */
const config = {
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/src/test/**/*.spec.ts"],
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^@/(.*)\\.js$": "<rootDir>/src/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: { "^.+\\.ts$": ["ts-jest", { useESM: true }] },
  testTimeout: 30_000,
};

export default config;
