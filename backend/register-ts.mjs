// Lets plain Node run the TypeScript sources as ES modules (`dev`, `openapi`, the configuration suite and the browser
// journeys): ts-node compiles them, and the hook registered last, which runs first, resolves `@/` to `src/`.
import { register } from "node:module";

register("ts-node/esm/transpile-only", import.meta.url);
register("./alias-hooks.mjs", import.meta.url);
