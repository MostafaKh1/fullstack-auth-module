// The `@/*` entry of "paths" in tsconfig.json, which ts-node does not apply to ES modules.
const sourceRoot = new URL("./src/", import.meta.url);

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return nextResolve(new URL(specifier.slice(2), sourceRoot).href, context);
  }
  return nextResolve(specifier, context);
}
