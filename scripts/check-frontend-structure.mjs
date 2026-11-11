// Checks the front end's folder and file rules (frontend/AGENTS.md, "Where does this file belong?").
// Usage: node scripts/check-frontend-structure.mjs [--root <src dir>]
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);

const root = resolve(option("--root") ?? join(here, "../frontend/src"));

const SECTIONS = ["primitives", "base", "composite", "layout", "utility"];
const KINDED = ["base", "composite", "layout"];
// Imports a section may take from the components sections, earlier ones being more behaviour-only.
const MAY_IMPORT = {
  primitives: [],
  base: ["primitives"],
  composite: ["primitives", "base", "utility"],
  layout: ["primitives", "base", "composite", "utility"],
  utility: [],
};
const NEVER_IMPORTED_BY_COMPONENTS = ["pages", "app", "tests"];
const ONLY_UTILS = ["primitives", "base", "utility"];

const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const KIND = /^[a-z][a-z0-9]*(-[a-z0-9]+)*s$/;
const HOOK = /^use[A-Z][A-Za-z0-9]*$/;
const SOURCE = /\.(ts|tsx|js|jsx)$/;
const TEST = /\.test\.[tj]sx?$/;

const stemOf = (name) => name.split(".")[0];
const startsWithPrefix = (stem, prefix) => stem.startsWith(prefix) && /[A-Z]/.test(stem[prefix.length] ?? "");
const isComponentFolder = (dir) => dir.startsWith("components/") && PASCAL.test(dir.split("/").at(-1));

function walk(dir) {
  const items = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const path = join(dir, entry.name);
    items.push({ rel: relative(root, path).split("\\").join("/"), isDir: entry.isDirectory() });
    if (entry.isDirectory()) items.push(...walk(path));
  }
  return items;
}

const items = walk(root);
const files = items.filter((item) => !item.isDir).map((item) => item.rel);
const fileSet = new Set(files);
const childrenOf = new Map();
for (const { rel } of items) {
  const parent = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
  childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), rel.slice(rel.lastIndexOf("/") + 1)]);
}

const violations = new Map();
function violate(rule, path, message) {
  const key = `${rule} ${path}`;
  if (!violations.has(key)) violations.set(key, message);
}

// The import graph over source files: file -> files it imports.
const IMPORT = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
function resolveImport(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith("."))
    base = relative(root, resolve(root, dirname(from), spec))
      .split("\\")
      .join("/");
  else return undefined;
  return [base, ...[".ts", ".tsx", ".js", ".jsx"].map((ext) => base + ext)].find((candidate) =>
    fileSet.has(candidate),
  );
}
const imports = new Map();
for (const file of files.filter((f) => SOURCE.test(f))) {
  const text = readFileSync(join(root, file), "utf8");
  const targets = new Set();
  const dir = file.includes("/") ? file.slice(0, file.lastIndexOf("/")) : "";
  for (const match of text.matchAll(IMPORT)) {
    const spec = match[1];
    if (spec.startsWith(".") && !(isComponentFolder(dir) && spec.startsWith("./"))) {
      violate(
        "relative-import",
        file,
        "import through @/; only a component folder's child uses ./ for a sibling",
      );
    }
    const target = resolveImport(file, spec);
    if (target) targets.add(target);
  }
  imports.set(file, targets);
}
const importersOf = (target) =>
  [...imports]
    .filter(([file, targets]) => !TEST.test(file) && file !== target && targets.has(target))
    .map(([file]) => file);

function checkComponents(item, segs) {
  const { rel, isDir } = item;
  const name = segs.at(-1);
  const depth = segs.length;
  const stem = stemOf(name);
  if (depth === 2) {
    if (!isDir || !SECTIONS.includes(name)) {
      violate("section-unknown", rel, `components/ holds only the sections ${SECTIONS.join(", ")}`);
    }
    return;
  }
  const section = segs[1];
  if (!SECTIONS.includes(section)) return;
  const parent = segs[depth - 2];
  const inComponentFolder = isComponentFolder(segs.slice(0, -1).join("/"));
  const screenHome = "components/composite/screens/";

  if (isDir) {
    if (section === "primitives") {
      violate("primitives-flat", rel, "primitives stay flat: no folders");
      return;
    }
    if (depth === 3 && KINDED.includes(section) && !KIND.test(name)) {
      violate("kind-folder", rel, `${section}/ holds plural kebab-case kind folders`);
    }
    if ((depth >= 4 || !KINDED.includes(section)) && !PASCAL.test(name)) {
      violate("folder-casing", rel, "a folder in a kind folder is a PascalCase component folder");
    }
    if (!PASCAL.test(name)) return;
    const children = childrenOf.get(rel) ?? [];
    if (!children.some((child) => !TEST.test(child) && /\.tsx?$/.test(child) && stemOf(child) === name)) {
      violate("component-folder-entry", rel, `a component folder needs an entry file ${name}.tsx`);
    }
    if (inComponentFolder && !startsWithPrefix(name, parent)) {
      violate("folder-prefix", rel, `a child folder's name starts with ${parent}`);
    }
    if (name.endsWith("Screen") && !rel.startsWith(screenHome)) {
      violate("screen-folder", rel, "a Screen component sits in components/composite/screens/");
    }
    return;
  }

  if (depth === 3 && KINDED.includes(section)) {
    violate("kind-folder", rel, `a file goes in a kind folder inside ${section}/, not directly in it`);
    return;
  }
  if (!PASCAL.test(stem)) {
    violate("file-casing", rel, "a file in components/ is PascalCase");
    return;
  }
  if (inComponentFolder) {
    if (!startsWithPrefix(stem, parent) && stem !== parent) {
      violate("folder-prefix", rel, `a child file's name starts with ${parent}`);
    }
  } else if (stem.endsWith("Screen") && !rel.startsWith(screenHome)) {
    violate("screen-folder", rel, "a Screen component sits in components/composite/screens/");
  }
}

function checkOther(item, segs) {
  const { rel, isDir } = item;
  const name = segs.at(-1);
  const top = segs[0];
  const stem = stemOf(name);
  if (top === "pages") {
    if (isDir) {
      if (!KEBAB.test(name.replace(/^\((.*)\)$/, "$1")))
        violate("folder-casing", rel, "page folders are kebab-case");
    } else if (!/^[A-Z][A-Za-z0-9]*Page$/.test(stem)) {
      violate("page-name", rel, "a page file is named <Name>Page");
    }
    return;
  }
  if (top === "hooks" && segs.length === 2 && !isDir) {
    if (!HOOK.test(stem)) violate("hook-name", rel, "a hook file is useX in camelCase");
    else if (!TEST.test(name) && importersOf(rel).length < 2) {
      violate("hook-single-use", rel, "a hook used by fewer than two files lives beside its component");
    }
    return;
  }
  if (isDir) {
    if (!KEBAB.test(name)) violate("folder-casing", rel, "folders outside components/ are kebab-case");
    return;
  }
  const componentModule = (top === "app" || top === "providers") && name.endsWith(".tsx");
  if (!KEBAB.test(stem) && !(componentModule && PASCAL.test(stem))) {
    violate("file-casing", rel, "files outside component folders are kebab-case");
  }
}

for (const item of items) {
  const segs = item.rel.split("/");
  const name = segs.at(-1);
  if (
    !item.isDir &&
    SOURCE.test(name) &&
    segs[0] !== "hooks" &&
    HOOK.test(stemOf(name)) &&
    !TEST.test(name)
  ) {
    violate(
      "hook-location",
      item.rel,
      "a hook lives in hooks/, or in its single component's folder with the prefix",
    );
    continue;
  }
  if (segs[0] === "components") checkComponents(item, segs);
  else checkOther(item, segs);
  if (!item.isDir && /^index\.(ts|tsx|js|jsx|mjs)$/.test(name))
    violate("no-barrel", item.rel, "no index files");
}

// Barrels that are not named index.
const REEXPORTS = /^(?:export\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s+["'][^"']+["'];?\s*)+$/;
for (const file of files.filter((f) => SOURCE.test(f))) {
  const code = readFileSync(join(root, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")
    .trim();
  if (code && REEXPORTS.test(code)) violate("no-barrel", file, "a file that only re-exports is a barrel");
}

// Helpers: three or more sharing a first word belong in a folder named for the concern.
const concerns = new Map();
for (const name of childrenOf.get("utils") ?? []) {
  if (items.find((item) => item.rel === `utils/${name}`)?.isDir) continue;
  const stem = stemOf(name);
  concerns.set(stem.split("-")[0], [...(concerns.get(stem.split("-")[0]) ?? []), name]);
}
for (const names of concerns.values()) {
  if (new Set(names.map(stemOf)).size < 3) continue;
  for (const name of names)
    violate("helper-concern", `utils/${name}`, "three or more helpers of one concern get a folder");
}

// Single-use children and section import direction.
for (const { rel } of items.filter((item) => item.isDir && item.rel.startsWith("components/"))) {
  const name = rel.split("/").at(-1);
  if (!PASCAL.test(name)) continue;
  const unitOf = (file) => file.slice(rel.length + 1).split("/")[0];
  const entry = `${name}.tsx`;
  for (const child of childrenOf.get(rel) ?? []) {
    if (child === entry || TEST.test(child) || child === `${name}.ts`) continue;
    const childPath = `${rel}/${child}`;

    const own = files.filter((file) => file.startsWith(`${childPath}/`) || file === childPath);
    const importers = new Set();
    for (const file of own) {
      for (const importer of importersOf(file)) {
        if (importer.startsWith(`${rel}/`) && unitOf(importer) !== child) importers.add(unitOf(importer));
      }
    }
    if (importers.size === 1 && ![entry, `${name}.ts`].includes([...importers][0])) {
      violate(
        "single-use-child",
        childPath,
        `only ${[...importers][0]} uses it: move it inside that sibling's folder`,
      );
    }
  }
}

for (const [file, targets] of imports) {
  const segs = file.split("/");
  if (segs[0] !== "components" || TEST.test(file) || !SECTIONS.includes(segs[1])) continue;
  const section = segs[1];
  for (const target of targets) {
    const tsegs = target.split("/");
    if (tsegs[0] === "components") {
      const targetSection = tsegs[1];
      if (targetSection !== section && !MAY_IMPORT[section].includes(targetSection)) {
        violate("section-imports", file, `${section} may not import ${targetSection}`);
      }
    } else if (NEVER_IMPORTED_BY_COMPONENTS.includes(tsegs[0])) {
      violate("section-imports", file, `components may not import ${tsegs[0]}/`);
    } else if (ONLY_UTILS.includes(section) && tsegs[0] !== "utils") {
      violate("section-imports", file, `${section} may import only utils/ outside components/`);
    }
  }
}

const problems = [...violations]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, message]) => `${key}: ${message}`);

if (problems.length > 0) {
  process.stderr.write(
    `Front-end structure check failed (${problems.length}):\n${problems.map((p) => `  ${p}`).join("\n")}\n`,
  );
  process.exit(1);
}
process.stdout.write("Front-end structure check passed.\n");
